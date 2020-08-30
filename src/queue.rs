use crate::date::{min_to_secs, timestamp};
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
  num_acknowledged: u64,
  num_dedup_hits: u64,
  created_at: u64,
}

impl Queue {
  // Create a new empty queue
  pub fn new(id: String) -> Queue {
    return Queue {
      id,
      items: VecDeque::new(),
      dedup_set: HashSet::new(),
      ack_map: HashMap::new(),
      num_dedup_hits: 0,
      num_acknowledged: 0,
      created_at: timestamp(),
    };
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
      let lifetime = min_to_secs(5); // TODO: env variable or property in queue
      self.dedup_set.insert(d_id.clone());
      let this_id = self.id.clone();
      // Start timeout thread to remove item from dedup map
      thread::spawn(move || {
        thread::sleep(Duration::from_secs(lifetime));
        let mut queue_map = QUEUES.lock().unwrap();
        let this_queue = queue_map.get_mut(&this_id);
        if this_queue.is_some() {
          let queue = this_queue.unwrap();
          queue.dedup_set.remove(&d_id);
        }
      });
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

  // Returns the first element, but does not dequeue it
  fn peek(&mut self) -> Option<Message> {
    let item_maybe = self.items.get(0);
    if item_maybe.is_some() {
      return Some(item_maybe.unwrap().clone());
    }
    return None;
  }

  // Removes and returns the first element
  pub fn dequeue(&mut self, peek: bool, auto_ack: bool) -> Option<Message> {
    let item_maybe = self.peek();
    if item_maybe.is_some() {
      if !peek {
        self.items.pop_front();
        if auto_ack {
          self.num_acknowledged += 1;
        } else {
          // Start timeout thread to remove item from ack map & back into queue
          let message = item_maybe.clone().unwrap();
          let message_id = message.id.clone();
          let lifetime = min_to_secs(5); // TODO: env variable or property in queue
          self.ack_map.insert(message_id.clone(), message);
          let this_id = self.id.clone();
          thread::spawn(move || {
            thread::sleep(Duration::from_secs(lifetime));
            let mut queue_map = QUEUES.lock().unwrap();
            let this_queue = queue_map.get_mut(&this_id);
            if this_queue.is_some() {
              let queue = this_queue.unwrap();
              let message = queue.ack_map.remove(&message_id);
              queue.items.push_back(message.unwrap());
            }
          });
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
  pub fn deduped_size(&self) -> usize {
    self.dedup_set.len()
  }
}
