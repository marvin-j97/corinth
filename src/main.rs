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
use crate::global_data::read_queues_from_disk;
use crate::server::create_server;

fn main() {
  read_queues_from_disk();
  create_server()
    .listen(format!("127.0.0.1:{}", get_port()))
    .expect("Fatal error");
}
