use crate::date::{min_to_secs, timestamp};
use oysterpack_uid::ulid::ulid_str;
use serde_json::Value;
use std::collections::{HashMap, VecDeque};

#[derive(Serialize, Deserialize, Clone)]
pub struct Message {
  id: String,
  item: Value,
}

struct DedupItem {
  id: String,
  expires_at: u64,
}

pub struct Queue {
  items: VecDeque<Message>,
  dedup_map: HashMap<String, DedupItem>,
}

impl Queue {
  pub fn new() -> Queue {
    return Queue {
      items: VecDeque::new(),
      dedup_map: HashMap::new(),
    };
  }

  pub fn enqueue(&mut self, item: Value, dedup_id: Option<String>) -> bool {
    let id = ulid_str();
    self.items.push_back(Message {
      id: id.clone(),
      item,
    });
    if dedup_id.is_some() {
      let d_id = dedup_id.unwrap();
      if self.dedup_map.get(&d_id).is_some() {
        return false;
      }
      let dedup_item = DedupItem {
        id,
        expires_at: timestamp() + min_to_secs(5),
      };
      self.dedup_map.insert(d_id, dedup_item);
    }
    true
  }

  fn peek(&mut self) -> Option<Message> {
    let item_maybe = self.items.get(0);
    if item_maybe.is_some() {
      return Some(item_maybe.unwrap().clone());
    }
    return None;
  }

  pub fn dequeue(&mut self, peek: bool) -> Option<Message> {
    let item_maybe = self.peek();
    if item_maybe.is_some() {
      if !peek {
        self.items.pop_front();
      }
      return Some(item_maybe.unwrap().clone());
    }
    return None;
  }

  pub fn size(&self) -> usize {
    self.items.len()
  }

  pub fn deduped_size(&self) -> usize {
    self.dedup_map.len()
  }
}
