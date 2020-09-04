use crate::date::timestamp;
use crate::global_data::QUEUES;
use oysterpack_uid::ulid::ulid_str;
use serde_json::Value;
use std::collections::{HashMap, HashSet, VecDeque};
use std::thread;
use std::time::Duration;

#[derive(Serialize, Deserialize, Clone)]
pub struct Message {
  id: String,
  queued_at: u64,
  item: Value,
}

pub struct Queue {
  id: String,

  items: VecDeque<Message>,
  dedup_set: HashSet<String>,
  ack_map: HashMap<String, Message>,

  created_at: u64,
  num_acknowledged: u64,
  num_dedup_hits: u64,

  ack_time: u32,
  dedup_time: u32,
}

impl Queue {
  // Create a new empty queue
  pub fn new(id: String, ack_time: u32, dedup_time: u32) -> Queue {
    return Queue {
      id,
      items: VecDeque::new(),
      dedup_set: HashSet::new(),
      ack_map: HashMap::new(),
      num_dedup_hits: 0,
      num_acknowledged: 0,
      created_at: timestamp(),
      ack_time,
      dedup_time,
    };
  }

  // Acknowledge message reception
  // Returns true if the message was marked as acknowledged
  // False otherwise
  pub fn ack(&mut self, id: String) -> bool {
    let item = self.ack_map.get(&id);
    if item.is_some() {
      self.ack_map.remove(&id);
      self.num_acknowledged += 1;
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
        self.num_dedup_hits += 1;
        return false;
      }
      let lifetime = self.dedup_time.into();
      self.dedup_set.insert(d_id.clone());
      if lifetime > 0 {
        self.schedule_dedup_item(d_id, lifetime);
      }
    }
    true
  }

  fn enqueue(&mut self, id: String, item: Value) -> Message {
    let message = Message {
      id,
      item,
      queued_at: timestamp(),
    };
    self.items.push_back(message.clone());
    message
  }

  // Tries to enqueue the given item
  // If a deduplication id is given and the id is currently being tracked the message will be dropped
  // Returns the message or None
  pub fn try_enqueue(&mut self, item: Value, dedup_id: Option<String>) -> Option<Message> {
    let id = ulid_str();
    if self.register_dedup_id(dedup_id) {
      return Some(self.enqueue(id, item));
    }
    None
  }

  // Start timeout thread to remove item from ack map & back into queue
  fn schedule_ack_item(&mut self, message: Message, lifetime: u64) {
    let message_id = message.id.clone();
    self.ack_map.insert(message_id.clone(), message.clone());
    let this_id = self.id.clone();
    thread::spawn(move || {
      thread::sleep(Duration::from_secs(lifetime));
      let mut queue_map = QUEUES.lock().unwrap();
      let this_queue = queue_map.get_mut(&this_id);
      if this_queue.is_some() {
        let queue = this_queue.unwrap();
        let message = queue.ack_map.remove(&message_id);
        if message.is_some() {
          queue.items.push_back(message.unwrap());
        }
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
      if auto_ack {
        self.num_acknowledged += 1;
      } else {
        let message = item_maybe.clone().unwrap();
        let lifetime = self.ack_time.into();
        if lifetime > 0 {
          self.schedule_ack_item(message, lifetime);
        }
      }
      return item_maybe;
    }
    None
  }

  // Returns the size of the queue
  pub fn size(&self) -> usize {
    self.items.len()
  }

  // Returns the amount of successfully acknowledges messages
  pub fn num_acknowledged(&self) -> u64 {
    self.num_acknowledged
  }

  // Returns the time the queue was created
  pub fn created_at(&self) -> u64 {
    self.created_at
  }

  // Returns the amount of dedup hits
  pub fn num_dedup_hits(&self) -> u64 {
    self.num_dedup_hits
  }

  // Returns the amount of deduplication ids currently being tracked
  pub fn dedup_size(&self) -> usize {
    self.dedup_set.len()
  }

  // Returns the amount of unacknowledged messages currently being tracked
  pub fn ack_size(&self) -> usize {
    self.ack_map.len()
  }

  pub fn dedup_time(&self) -> u32 {
    self.dedup_time
  }

  pub fn ack_time(&self) -> u32 {
    self.ack_time
  }
}
