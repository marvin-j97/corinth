use crate::date::timestamp;
use crate::env::data_folder;
use crate::fs::{append_to_file, file_exists};
use crate::global_data::QUEUES;
use oysterpack_uid::ulid::ulid_str;
use serde_json::json;
use serde_json::Value;
use std::collections::{HashMap, HashSet, VecDeque};
use std::fs::{create_dir_all, read_to_string, remove_dir_all, remove_file, rename, File};
use std::io::{BufRead, BufReader, Write};
use std::mem::size_of;
use std::path::Path;
use std::thread;
use std::time::Duration;

#[derive(Serialize, Deserialize, Clone, Debug)]
enum MessageState {
  Pending,
  Requeued,
  Failed,
}

type StringifiedJson = String;

// Preallocate some space to avoid early reallocations
const INITIAL_SIZE: usize = 256;

pub fn unwrap_message(msg: Message) -> Value {
  let content: Value = serde_json::from_str(&msg.item).unwrap();
  json!({
    "id": msg.id,
    "queued_at": msg.queued_at,
    "updated_at": msg.updated_at,
    "item": content,
    "state": msg.state,
    "num_requeues": msg.num_requeues,
  })
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Message {
  id: String,
  queued_at: u64,
  updated_at: u64,
  item: StringifiedJson,
  state: MessageState,
  num_requeues: u16,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct QueueDeadLetterSettings {
  pub name: String,
  pub threshold: u16,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct QueueMeta {
  created_at: u64,
  last_compacted_at: u64,
  num_acknowledged: u64,
  num_deduplicated: u64,
  num_requeued: u64,
  requeue_time: u32,
  deduplication_time: u32,
  max_length: u64,
  pub dead_letter_queue: Option<QueueDeadLetterSettings>,
}

pub struct Queue {
  id: String,

  items: VecDeque<Message>,
  dedup_set: HashSet<String>,
  ack_map: HashMap<String, Message>,

  meta: QueueMeta,

  persistent: bool,
}

fn path_to_string(path: std::path::PathBuf) -> String {
  path.into_os_string().into_string().expect("Path error")
}

// Returns the relative folder path in which
// the queue is stored (items & metadata)
pub fn get_queue_folder(id: &String) -> String {
  let path = Path::new(&data_folder()).join("queues").join(&id);
  path_to_string(path)
}

pub fn queue_meta_file(id: &String) -> String {
  let path = Path::new(&get_queue_folder(id)).join("meta.json");
  path_to_string(path)
}

// Returns the relative path to the persistent storage file
// of the queue's items
fn queue_item_file(id: &String, suffix: String) -> String {
  let filename = format!("items{}.jsonl", suffix);
  let path = Path::new(&get_queue_folder(id)).join(filename);
  path_to_string(path)
}

// Temp file to write into
fn queue_temp_file(id: &String) -> String {
  queue_item_file(&id, String::from("~"))
}

// Reads a file and returns the resulting queue
// Keeps track of which items were deleted, and is ordered
// the same way the file is ordered
fn read_file(file: &String) -> VecDeque<Message> {
  // Result queue
  let mut items: VecDeque<Message> = VecDeque::with_capacity(INITIAL_SIZE);
  let deleted_flag = "$corinth_deleted";

  // Read file line-by-line
  let file = File::open(&file).expect("Couldn't open items.jsonl");
  let reader = BufReader::new(file);
  for line in reader.lines() {
    let line = line.unwrap();
    let obj: Value = serde_json::from_str(&line).expect("JSON parse failed");
    if obj[deleted_flag].is_string() {
      items.pop_front();
    } else {
      let msg: Message = serde_json::from_str(&line).expect("JSON parse failed");
      items.push_back(msg);
    }
  }

  items
}

// Write all items into a temp file
// Then rename tmp_file ~> real_file
fn compact_file(write_file: &String, compact_to: &String, items: &VecDeque<Message>) {
  eprintln!("Compacting {}", compact_to);

  File::create(write_file).expect("Failed to create temporary write file");

  for item in items.iter() {
    let line = serde_json::to_string(&item)
      .ok()
      .expect("JSON stringify error");
    append_to_file(write_file, format!("{}\n", line));
  }

  rename(write_file, &compact_to).expect("Failed to compact queue items");
}

// Initializes the queue's item queue from disk
fn init_items(id: &String) -> VecDeque<Message> {
  let mut items: VecDeque<Message> = VecDeque::with_capacity(INITIAL_SIZE);

  let queue_item_file = queue_item_file(&id, String::from(""));
  if file_exists(&queue_item_file) {
    items = read_file(&queue_item_file);
    // Minimize file size
    compact_file(&queue_temp_file(&id), &queue_item_file, &items);
  }

  items
}

fn write_metadata(id: &String, meta: &QueueMeta) {
  let file = queue_meta_file(&id);
  eprintln!("Writing metadata of {} to {}", id, file);
  let mut writer = File::create(&file).expect("unable to create meta file");
  writer
    .write_all(serde_json::to_string(&meta).unwrap().as_bytes())
    .expect("unable to write");
}

fn get_message(queue: &String, msg_id: &String) -> Option<Message> {
  let mut queue_map = QUEUES.lock().unwrap();
  let this_queue = queue_map.get_mut(queue);

  if this_queue.is_some() {
    let message = this_queue.unwrap().ack_map.remove(msg_id);
    message
  } else {
    None
  }
}

fn get_disk_size(filename: &String) -> u64 {
  let metadata = std::fs::metadata(filename).ok();

  if metadata.is_none() {
    eprintln!("Could not read queue file metadata");
    return 0;
  }

  metadata.unwrap().len()
}

impl Queue {
  pub fn write_metadata(&self) {
    write_metadata(&self.id, &self.meta)
  }

  pub fn get_memory_size(&self) -> usize {
    size_of::<Queue>()
      + self.size() * size_of::<Message>()
      + self.ack_size() * size_of::<Message>()
      + self.dedup_size() * size_of::<String>()
  }

  pub fn get_disk_size(&self) -> Option<u64> {
    if self.is_persistent() {
      let item_file = queue_item_file(&self.id, String::from(""));
      let item_file_size = get_disk_size(&item_file);

      let meta_file = queue_meta_file(&self.id);
      let meta_file_size = get_disk_size(&meta_file);

      Some(item_file_size + meta_file_size)
    } else {
      None
    }
  }

  pub fn start_compact_interval(&mut self, secs: u64) {
    if !self.is_persistent() || secs == 0 {
      return;
    }
    eprintln!(
      "Starting compaction timer for {} ({} millis)",
      self.get_name(),
      secs
    );
    let this_id = self.id.clone();
    thread::spawn(move || loop {
      thread::sleep(Duration::from_secs(secs));
      let mut queue_map = QUEUES.lock().unwrap();
      let this_queue = queue_map.get_mut(&this_id);
      if this_queue.is_some() {
        let queue = this_queue.unwrap();
        queue.compact();
      } else {
        break;
      }
    });
  }

  pub fn compact(&mut self) {
    eprintln!("Compacting queue {}", &self.id);

    let id = &self.id;
    let queue_item_file = queue_item_file(&id, String::from(""));
    compact_file(&queue_temp_file(id), &queue_item_file, &self.items);

    eprintln!("Updating last_compacted_at timestamp");
    self.meta.last_compacted_at = timestamp();
    self.write_metadata();
  }

  // Read queue from disk
  pub fn from_disk(id: String) -> Queue {
    eprintln!("Reading queue '{}' from disk", id);

    let items: VecDeque<Message> = init_items(&id);
    let mut queue = Queue {
      id: id.clone(),
      items,
      dedup_set: HashSet::with_capacity(INITIAL_SIZE),
      ack_map: HashMap::with_capacity(INITIAL_SIZE),
      meta: QueueMeta {
        num_requeued: 0,
        num_deduplicated: 0,
        num_acknowledged: 0,
        created_at: timestamp(),
        last_compacted_at: timestamp(),
        requeue_time: 300,
        deduplication_time: 300,
        max_length: 0,
        dead_letter_queue: None,
      },
      persistent: true,
    };
    let metadata_file = queue_meta_file(&id);
    let metadata = read_to_string(metadata_file).expect("Couldn't read metadata file");
    let metadata: QueueMeta = serde_json::from_str(&metadata).expect("Couldn't read metadata file");
    queue.meta = metadata;

    // Overwrite timestamp because it was compacted on init
    queue.meta.last_compacted_at = timestamp();
    queue.write_metadata();

    queue
  }

  // Create a new empty queue
  pub fn new(
    id: String,
    requeue_time: u32,
    deduplication_time: u32,
    persistent: bool,
    max_length: u64,
    dead_letter_queue: Option<QueueDeadLetterSettings>,
  ) -> Queue {
    let items: VecDeque<Message> = VecDeque::new();
    let meta = QueueMeta {
      num_requeued: 0,
      num_deduplicated: 0,
      num_acknowledged: 0,
      created_at: timestamp(),
      last_compacted_at: 0,
      requeue_time,
      deduplication_time,
      max_length,
      dead_letter_queue,
    };
    if persistent {
      create_dir_all(get_queue_folder(&id)).expect("Invalid folder name");
      eprintln!("Created queue folder");
      write_metadata(&id, &meta);
    }
    return Queue {
      id,
      items,
      dedup_set: HashSet::with_capacity(INITIAL_SIZE),
      ack_map: HashMap::with_capacity(INITIAL_SIZE),
      meta,
      persistent,
    };
  }

  // Acknowledge message reception
  // Returns true if the message was marked as acknowledged
  // False otherwise
  pub fn ack(&mut self, id: String) -> bool {
    let item = self.ack_map.get(&id);
    if item.is_some() {
      self.ack_map.remove(&id);
      self.meta.num_acknowledged += 1;
      if self.persistent {
        self.write_metadata();
      }
      true
    } else {
      false
    }
  }

  // Start timeout thread to remove item from dedup map
  fn schedule_dedup_item(&mut self, id: String, lifetime: u64) {
    let this_id = self.id.clone();
    thread::spawn(move || {
      thread::sleep(Duration::from_secs(lifetime));
      let mut queue_map = QUEUES.lock().unwrap();
      let this_queue = queue_map.get_mut(&this_id);
      if this_queue.is_some() {
        this_queue.unwrap().dedup_set.remove(&id);
      }
    });
  }

  // Checks if the given dedup id is already being tracked
  // If not, it will be tracked
  // Returns true if the id was not originally tracked, false otherwise
  fn register_dedup_id(&mut self, dedup_id: Option<String>) -> bool {
    if dedup_id.is_some() {
      let d_id = dedup_id.unwrap();
      let dedup_in_map = self.dedup_set.contains(&d_id);
      if dedup_in_map {
        self.meta.num_deduplicated += 1;
        if self.persistent {
          self.write_metadata();
        }
        return false;
      }
      let lifetime = self.meta.deduplication_time.into();
      self.dedup_set.insert(d_id.clone());
      if lifetime > 0 {
        self.schedule_dedup_item(d_id, lifetime);
      }
    }
    true
  }

  fn enqueue_message(&mut self, msg: Message) -> Message {
    self.items.push_back(msg.clone());
    if self.persistent {
      let line = serde_json::to_string(&msg)
        .ok()
        .expect("JSON stringify error");
      append_to_file(
        &queue_item_file(&self.id, String::from("")),
        format!("{}\n", line),
      );
    }
    msg
  }

  fn enqueue_item(&mut self, id: String, item: Value) -> Message {
    let now = timestamp();
    let message = Message {
      id: id.clone(),
      item: serde_json::to_string(&item).unwrap(),
      queued_at: now,
      updated_at: now,
      state: MessageState::Pending,
      num_requeues: 0,
    };
    self.enqueue_message(message)
  }

  // Tries to enqueue the given item
  // If a deduplication id is given and the id is currently being tracked the message will be dropped
  // Returns the message or None
  pub fn try_enqueue(&mut self, item: Value, dedup_id: Option<String>) -> Option<Message> {
    let id = ulid_str();
    if self.register_dedup_id(dedup_id) {
      return Some(self.enqueue_item(id, item));
    }
    None
  }

  // Start timeout thread to remove item from ack map & back into queue
  fn schedule_ack_item(&mut self, message: Message, lifetime: u64) {
    eprintln!(
      "Schedule ack expiration: message <{}> (lifetime: {} secs)",
      message.id, lifetime
    );
    let message_id = message.id.clone();
    self.ack_map.insert(message_id.clone(), message.clone());
    let this_id = self.id.clone();
    thread::spawn(move || {
      thread::sleep(Duration::from_secs(lifetime));
      let message = get_message(&this_id, &message_id);
      if message.is_some() {
        let mut queue_map = QUEUES.lock().unwrap();
        let mut new_message = message.unwrap().clone();

        let queue = queue_map.get(&this_id).unwrap();

        let dead_letter_options = queue.get_meta().dead_letter_queue;
        if dead_letter_options.is_some() {
          if new_message.num_requeues >= dead_letter_options.clone().unwrap().threshold {
            // Move into dead letter queue
            let dead_letter_queue = queue_map.get_mut(&dead_letter_options.clone().unwrap().name);
            if dead_letter_queue.is_some() {
              let dead_letter_queue = dead_letter_queue.unwrap();
              new_message.state = MessageState::Failed;
              new_message.updated_at = timestamp();
              eprintln!(
                "Message <{}> added to dead letter queue <{}>",
                new_message.id, dead_letter_queue.id
              );
              dead_letter_queue.enqueue_message(new_message);
              return;
            } else {
              eprintln!(
                "Dead letter queue <{}> not found",
                dead_letter_options.unwrap().name
              );
            }
          }
        }

        // Requeue
        let queue = queue_map.get_mut(&this_id).unwrap();
        new_message.state = MessageState::Requeued;
        new_message.updated_at = timestamp();
        new_message.num_requeues += 1;
        eprintln!(
          "Requeuing: message <{}> (requeue #: {})",
          new_message.id, new_message.num_requeues
        );
        queue.meta.num_requeued += 1;
        queue.enqueue_message(new_message);
      }
    });
  }

  // Returns the first element, but does not dequeue it
  pub fn peek(&self) -> Option<Message> {
    let item_maybe = self.items.front();
    if item_maybe.is_some() {
      return Some(item_maybe.unwrap().clone());
    }
    return None;
  }

  // Removes and returns the first element
  pub fn dequeue(&mut self, auto_ack: bool) -> Option<Message> {
    let item_maybe = self.peek();
    if item_maybe.is_some() {
      self.items.pop_front();
      if self.persistent {
        let id = item_maybe.clone().unwrap().id;
        let line = format!("{{\"$corinth_deleted\":\"{}\" }}\n", id);
        append_to_file(&queue_item_file(&self.id, String::from("")), line);
      }
      if auto_ack {
        self.meta.num_acknowledged += 1;
        if self.persistent {
          self.write_metadata();
        }
      } else {
        let message = item_maybe.clone().unwrap();
        let lifetime = self.meta.requeue_time.into();
        if lifetime > 0 {
          self.schedule_ack_item(message, lifetime);
        }
      }
      return item_maybe;
    }
    None
  }

  pub fn can_fit_messages(&self, amount: u64) -> bool {
    let max = self.max_length();
    if max == 0 {
      return true;
    }
    let x: u64 = (self.size() as u64) + amount;
    x <= self.max_length()
  }

  pub fn get_meta(&self) -> QueueMeta {
    self.meta.clone()
  }

  pub fn max_length(&self) -> u64 {
    self.meta.max_length
  }

  // Returns the size of the queue
  pub fn size(&self) -> usize {
    self.items.len()
  }

  // Returns the amount of successfully acknowledges messages
  pub fn num_acknowledged(&self) -> u64 {
    self.meta.num_acknowledged
  }

  // Returns the time the queue was created
  pub fn created_at(&self) -> u64 {
    self.meta.created_at
  }

  // Returns the time the queue was last compacted at
  pub fn last_compacted_at(&self) -> u64 {
    self.meta.last_compacted_at
  }

  // Returns the amount of dedup hits
  pub fn num_deduplicated(&self) -> u64 {
    self.meta.num_deduplicated
  }

  // Returns the amount of deduplication ids currently being tracked
  pub fn dedup_size(&self) -> usize {
    self.dedup_set.len()
  }

  // Returns the amount of unacknowledged messages currently being tracked
  pub fn ack_size(&self) -> usize {
    self.ack_map.len()
  }

  pub fn set_deduplication_time(&mut self, time: u32) {
    self.meta.deduplication_time = time;
  }

  pub fn set_requeue_time(&mut self, time: u32) {
    self.meta.requeue_time = time;
  }

  pub fn deduplication_time(&self) -> u32 {
    self.meta.deduplication_time
  }

  pub fn requeue_time(&self) -> u32 {
    self.meta.requeue_time
  }

  pub fn is_persistent(&self) -> bool {
    self.persistent
  }

  pub fn num_requeued(&self) -> u64 {
    self.meta.num_requeued
  }

  pub fn get_name(&self) -> String {
    self.id.clone()
  }

  pub fn purge(&mut self, delete: bool) {
    self.items = VecDeque::with_capacity(INITIAL_SIZE);
    self.ack_map = HashMap::with_capacity(INITIAL_SIZE);
    self.dedup_set = HashSet::with_capacity(INITIAL_SIZE);
    self.meta.num_acknowledged = 0;
    self.meta.num_deduplicated = 0;
    self.meta.num_requeued = 0;

    if self.persistent {
      if delete {
        let folder = get_queue_folder(&self.id);
        if Path::new(&folder).exists() {
          remove_dir_all(folder).expect("Failed to delete queue folder");
        }
      } else {
        let item_file = queue_item_file(&self.id, String::from(""));
        if Path::new(&item_file).exists() {
          remove_file(item_file).expect("Failed to delete item file");
        }
        self.write_metadata();
      }
    }
  }
}
