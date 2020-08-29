#[macro_use]
extern crate nickel;
#[macro_use]
extern crate serde_derive;

mod date;
mod global_data;
mod port;
mod queue;
mod response;
mod server;

use crate::date::min_to_secs;
use crate::global_data::{create_data_folder, QUEUES};
use crate::server::create_server;
use port::get_port;
use std::thread;
use std::time::Duration;

fn main() {
  create_data_folder();

  thread::spawn(move || loop {
    {
      let mut queue_map = QUEUES.lock().unwrap();
      for (_name, queue) in queue_map.iter_mut() {
        queue.purge_dedup_items();
      }
      // Scope unlocks mutex
    }
    thread::sleep(Duration::from_secs(min_to_secs(15)));
  });

  let port = get_port();
  create_server()
    .listen(format!("127.0.0.1:{}", port))
    .expect("Fatal error");
}
