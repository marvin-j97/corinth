use oysterpack_uid::ulid::ulid_str;
use serde_json::Value;
use std::collections::VecDeque;

#[derive(Serialize, Deserialize)]
pub struct Message {
  id: String,
  pub item: Value,
}

pub struct Queue {
  items: VecDeque<Message>,
}

impl Queue {
  pub fn new() -> Queue {
    return Queue {
      items: VecDeque::new(),
    };
  }

  pub fn enqueue(&mut self, item: Value) {
    let id = ulid_str();
    self.items.push_back(Message { id, item });
  }

  pub fn dequeue(&mut self) -> Option<Message> {
    self.items.pop_front()
  }

  pub fn size(&self) -> usize {
    self.items.len()
  }
}
