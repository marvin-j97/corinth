use serde_json::Value;
use std::collections::VecDeque;

pub struct Queue {
  items: VecDeque<Value>,
}

impl Queue {
  pub fn new() -> Queue {
    return Queue {
      items: VecDeque::new(),
    };
  }

  pub fn size(&self) -> usize {
    self.items.len()
  }
}
