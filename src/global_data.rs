use crate::fs::create_data_folder;
use crate::queue::Queue;
use lazy_static::lazy_static;
use nickel::Request;
use std::collections::HashMap;
use std::fs::metadata;
use std::fs::read_dir;
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

pub fn read_queues_from_disk() {
  let folder = create_data_folder();
  let entries = read_dir(folder).expect("readdir failed");
  let mut queue_map = QUEUES.lock().unwrap();
  for entry in entries {
    let file = entry.unwrap();
    if metadata(file.path()).unwrap().is_dir() {
      let queue_name = file.file_name();
      let queue_name = queue_name.into_string().unwrap();
      let queue = Queue::from_disk(queue_name.clone());
      println!("Read queue '{}' from disk", queue_name);
      queue_map.insert(queue_name, queue);
    }
  }
}
