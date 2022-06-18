use crate::env::get_compaction_interval;
use crate::fs::create_queues_folder;
use crate::fs::file_exists;
use crate::queue::{queue_meta_file, Queue};
use actix_web::HttpRequest;
use lazy_static::lazy_static;
use std::collections::HashMap;
use std::fs::metadata;
use std::fs::read_dir;
use std::sync::{Mutex, RwLock};
use std::time::Instant;

lazy_static! {
  pub static ref QUEUES: Mutex<HashMap<String, Queue>> = {
    let map: HashMap<String, Queue> = HashMap::new();
    Mutex::new(map)
  };
  pub static ref START_TIME: RwLock<Instant> = RwLock::new(Instant::now());
}

pub fn get_start_time() -> Instant {
  let mutex = START_TIME.read().unwrap();
  let start = *mutex;
  start
}

pub fn queue_exists(req: &HttpRequest) -> bool {
  let queue_map = QUEUES.lock().unwrap();
  let queue_name: String = req.match_info().query("queue_name").parse().unwrap();
  let queue_maybe = queue_map.get(&queue_name);
  queue_maybe.is_some()
}

pub fn read_queues_from_disk() {
  let folder = create_queues_folder();
  let entries = read_dir(folder).expect("readdir failed");
  let mut queue_map = QUEUES.lock().unwrap();

  for entry in entries {
    let file = entry.unwrap();
    let queue_name = file.file_name().into_string().unwrap();
    if metadata(file.path()).unwrap().is_dir() {
      if file_exists(&queue_meta_file(&queue_name)) {
        let mut queue = Queue::from_disk(queue_name.clone());
        queue.start_compact_interval(get_compaction_interval().into());
        queue_map.insert(queue_name, queue);
      } else {
        eprintln!("Metadata file not found, skipping...")
      }
    } else {
      eprintln!("File in CORINTH_BASE_FOLDER not a folder, skipping...")
    }
  }
}
