use crate::queue::Queue;
use lazy_static::lazy_static;
use nickel::Request;
use std::collections::HashMap;
use std::sync::RwLock;

lazy_static! {
  pub static ref QUEUES: RwLock<HashMap<String, Queue>> = {
    let map: HashMap<String, Queue> = HashMap::new();
    RwLock::new(map)
  };
}

pub fn queue_exists(req: &mut Request) -> bool {
  let queue_map = QUEUES.read().unwrap();
  let queue_name = String::from(req.param("queue_name").unwrap());
  let queue_maybe = queue_map.get(&queue_name);
  queue_maybe.is_some()
}
