#[macro_use]
extern crate serde_derive;

mod date;
mod env;
mod fs;
mod global_data;
mod queue;
mod response;
mod routes;

use crate::env::get_port;
use crate::global_data::read_queues_from_disk;
use crate::routes::{
  ack_handler, close_handler, compact_handler, create_queue_handler, delete_handler,
  dequeue_handler, edit_queue_handler, enqueue_handler, favicon_handler, get_queue_handler,
  index_handler, list_queues_handler, peek_handler, purge_handler, server_info_handler,
};
use actix_files::Files;
use actix_web::{App, HttpServer};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
  read_queues_from_disk();

  let port = get_port();
  let bind = format!("0.0.0.0:{}", port);

  eprintln!("Starting on port {}", port);

  let server = HttpServer::new(|| {
    App::new()
      .service(index_handler)
      .service(server_info_handler)
      .service(favicon_handler)
      .service(create_queue_handler)
      .service(list_queues_handler)
      .service(get_queue_handler)
      .service(enqueue_handler)
      .service(ack_handler)
      .service(peek_handler)
      .service(dequeue_handler)
      .service(edit_queue_handler)
      .service(compact_handler)
      .service(purge_handler)
      .service(delete_handler)
      .service(close_handler)
      .service(Files::new("/assets", "assets"))
      .service(Files::new("/dashboard", "dashboard"))
  });

  server.bind(bind)?.run().await
}
