#[macro_use]
extern crate nickel;
#[macro_use]
extern crate serde_derive;

mod date;
mod env;
mod fs;
mod global_data;
mod queue;
mod response;
mod server;

use crate::env::get_port;
use crate::fs::create_data_folder;
use crate::global_data::QUEUES;
use crate::server::create_server;
use queue::Queue;
use std::fs::{metadata, read_dir};

fn main() {
  {
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

  create_server()
    .listen(format!("127.0.0.1:{}", get_port()))
    .expect("Fatal error");
}
