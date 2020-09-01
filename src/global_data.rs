use crate::queue::Queue;
use lazy_static::lazy_static;
use nickel::Request;
use std::collections::HashMap;
use std::env;
use std::fs::create_dir;
use std::sync::Mutex;

lazy_static! {
  pub static ref QUEUES: Mutex<HashMap<String, Queue>> = {
    let map: HashMap<String, Queue> = HashMap::new();
    Mutex::new(map)
  };
}

pub fn queue_exists(req: &mut Request) -> bool {
  let queue_map = QUEUES.lock().unwrap();
  let queue_name = String::from(req.param("queue_name").unwrap());
  let queue_maybe = queue_map.get(&queue_name);
  queue_maybe.is_some()
}

pub fn try_env_to_uint(name: String) -> Option<u64> {
  let str_value = env::var(name).ok();
  if str_value.is_some() {
    return Some(
      str_value
        .unwrap()
        .parse::<u64>()
        .expect("Invalid env variable!"),
    );
  }
  None
}

pub fn data_folder() -> String {
  env::var("CORINTH_BASE_FOLDER").unwrap_or(String::from(".corinth"))
}

pub fn create_data_folder() {
  create_dir(data_folder()).ok();
}
