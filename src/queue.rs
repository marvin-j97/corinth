use crate::date::{min_to_secs, timestamp};
use oysterpack_uid::ulid::ulid_str;
use serde_json::Value;
use std::collections::{HashMap, VecDeque};

#[derive(Serialize, Deserialize, Clone)]
pub struct Message {
  id: String,
  queued_at: u64,
  item: Value,
}

struct DedupItem {
  expires_at: u64,
}

pub struct Queue {
  items: VecDeque<Message>,
  dedup_map: HashMap<String, DedupItem>,
  num_done: u64,
  num_dedup_hits: u64,
  created_at: u64,
}

impl Queue {
  // Create a new empty queue
  pub fn new() -> Queue {
    return Queue {
      items: VecDeque::new(),
      dedup_map: HashMap::new(),
      num_dedup_hits: 0,
      num_done: 0,
      created_at: timestamp(),
    };
  }

  // Checks if the given dedup id is already being tracked
  // If not, it will be tracked
  // Returns true if the id was not originally tracked, false otherwise
  fn register_dedup_id(&mut self, dedup_id: Option<String>) -> bool {
    if dedup_id.is_some() {
      let d_id = dedup_id.unwrap();
      let dedup_in_map = self.dedup_map.get(&d_id);
      if dedup_in_map.is_some() && dedup_in_map.unwrap().expires_at > timestamp() {
        self.num_dedup_hits += 1;
        return false;
      }
      let dedup_item = DedupItem {
        expires_at: timestamp() + min_to_secs(5),
      };
      self.dedup_map.insert(d_id, dedup_item);
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
  pub fn dequeue(&mut self, peek: bool) -> Option<Message> {
    let item_maybe = self.peek();
    if item_maybe.is_some() {
      if !peek {
        self.items.pop_front();
      }
      return item_maybe;
    }
    return None;
  }

  // Returns the size of the queue
  pub fn size(&self) -> usize {
    self.items.len()
  }

  // Returns the amount of successfully acknowledges messages
  pub fn num_done(&self) -> u64 {
    self.num_done
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
    self.dedup_map.len()
  }
}
