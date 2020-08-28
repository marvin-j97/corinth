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

use crate::global_data::create_data_folder;
use crate::server::create_server;
use port::get_port;

fn main() {
  create_data_folder();

  let port = get_port();
  create_server()
    .listen(format!("127.0.0.1:{}", port))
    .expect("Fatal error");
}
