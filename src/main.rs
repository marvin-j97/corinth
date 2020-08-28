#[macro_use]
extern crate nickel;
#[macro_use]
extern crate serde_derive;

mod date;
mod global_data;
mod queue;
mod response;

use crate::global_data::queue_exists;
use crate::global_data::QUEUES;
use crate::nickel::QueryString;
use date::{iso_date, timestamp};
use nickel::status::StatusCode;
use nickel::{HttpRouter, JsonBody, Nickel};
use queue::Queue;
use response::{error, success};
use serde_json::{json, Value};
use std::env;
use std::fs;
use std::time::Instant;

#[derive(Serialize, Deserialize)]
struct EnqueueBody {
  item: Value,
}

fn main() {
  let folder = env::var("CORINTH_BASE_FOLDER").unwrap_or(String::from("corinth_data"));
  fs::create_dir(folder).ok();

  let mut server = Nickel::new();
  let start_time = Instant::now();

  // Logger middleware
  server.utilize(middleware! { |req|
    println!("{} {}: {}", req.origin.method.to_string(), req.origin.uri.to_string(), iso_date());
  });

  // Get server info
  server.get(
    "/",
    middleware! { |_req, mut res|
      let now = timestamp();
      let uptime_secs = start_time.elapsed().as_secs();
      success(&mut res, StatusCode::Ok, json!({
        "name": String::from("Corinth"),
        "version": String::from("0.0.1"),
        "uptime_ms": uptime_secs * 1000,
        "uptime_secs": uptime_secs,
        "started_at": now - uptime_secs,
      }))

    },
  );

  // Get queue info
  server.get(
    "/queue/:queue_name",
    middleware! { |req, mut res|
      if queue_exists(req) {
        let queue_name = String::from(req.param("queue_name").unwrap());
        let queue_map = QUEUES.lock().unwrap();
        let queue = queue_map.get(&queue_name).unwrap();
        success(&mut res, StatusCode::Ok, json!({
          "name": queue_name,
          "size": queue.size(),
          "num_deduped": queue.deduped_size(),
        }))
      }
      else {
        error(&mut res, StatusCode::NotFound, "Queue not found")
      }
    },
  );

  server.post(
    "/queue/:queue_name/enqueue",
    middleware! { |req, mut res|
      let body = try_with!(res, {
          req.json_as::<EnqueueBody>().map_err(|e| (StatusCode::BadRequest, e))
      });
      if body.item.is_object() {
        if queue_exists(req) {
          let mut queue_map = QUEUES.lock().unwrap();
          let queue = queue_map.get_mut(&String::from(req.param("queue_name").unwrap())).unwrap();
          let dedup_id = req.query().get("deduplication_id");
          if queue.enqueue(body.item, if dedup_id.is_some() { Some(String::from(dedup_id.unwrap())) } else { None }) {
            // Enqueued message
            success(&mut res, StatusCode::Created, json!({
              "message": "Message enqueued"
            }))
          }
          else {
            // Message deduplicated
            success(&mut res, StatusCode::Accepted, json!({
              "message": "Message has been deduplicated"
            }))
          }
        }
        else {
          // TODO: check ?create_queue=true
          error(&mut res, StatusCode::NotFound, "Queue not found")
        }
      }
      else {
        error(&mut res, StatusCode::BadRequest, "body.item is required to be of type 'object'")
      }
    },
  );

  server.post(
    "/queue/:queue_name/dequeue",
    middleware! { |req, mut res|
      if queue_exists(req) {
        let mut queue_map = QUEUES.lock().unwrap();
        let queue = queue_map.get_mut(&String::from(req.param("queue_name").unwrap())).unwrap();
        let message = queue.dequeue();
        if message.is_some() {
          success(&mut res, StatusCode::Ok, json!({
            "message": message.unwrap()
          }))
        }
        else {
          success(&mut res, StatusCode::NoContent, json!(null))
        }
      }
      else {
        error(&mut res, StatusCode::NotFound, "Queue not found")
      }
    },
  );

  server.put(
    "/queue/:queue_name",
    middleware! { |req, mut res|
      if queue_exists(req) {
        error(&mut res, StatusCode::Conflict, "Queue already exists")
      }
      else {
        let mut queue_map = QUEUES.lock().unwrap();
        let queue_name = String::from(req.param("queue_name").unwrap());
        queue_map.insert(queue_name, Queue::new());
        success(&mut res, StatusCode::Created, json!(null))
      }
    },
  );

  // Parse port from cli arguments
  // TODO: use env variable instead
  let mut port = 6767;

  let args: Vec<String> = std::env::args().collect();
  let num_args = args.len();
  let mut i = 0;

  while i < num_args - 1 {
    if args[i] == "--port" {
      let port_num: Option<u32> = args[i + 1].parse::<u32>().ok();
      if port_num.is_none() {
        println!("Invalid --port argument");
        std::process::exit(1);
      } else {
        port = port_num.unwrap();
      }
    }
    i += 1;
  }

  // Start server
  server
    .listen(format!("127.0.0.1:{}", port))
    .expect("Fatal error");
}
