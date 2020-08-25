#[macro_use]
extern crate nickel;
#[macro_use]
extern crate serde_derive;

mod queue;

use chrono::{DateTime, Local};
use lazy_static::lazy_static;
use nickel::status::StatusCode;
use nickel::{HttpRouter, Nickel};
use queue::Queue;
use std::collections::HashMap;
use std::fs;
use std::sync::Mutex;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

#[derive(Serialize, Deserialize)]
struct RootInfo {
  name: String,
  version: String,
  uptime_secs: u64,
  started_at: u64,
}

#[derive(Serialize, Deserialize)]
struct QueueInfoResponse {
  name: String,
  size: u64,
}

#[derive(Serialize, Deserialize)]
struct ErrorResponse {
  error: bool,
  message: String,
}

lazy_static! {
  static ref QUEUES: Mutex<HashMap<String, Queue>> = {
    let mut map: HashMap<String, Queue> = HashMap::new();
    let test_name = String::from("abc");
    map.insert(test_name, Queue::new());
    Mutex::new(map)
  };
}

fn main() {
  fs::create_dir("corinth_data").ok();

  let mut server = Nickel::new();
  let start_time = Instant::now();

  // Logger middleware
  server.utilize(middleware! { |request|
    let now: DateTime<Local> = Local::now();
    println!("{} {}: {}", request.origin.method.to_string(), request.origin.uri.to_string(), now.to_rfc2822());
  });

  // Get server info
  server.get(
    "/",
    middleware! { |_req|
      let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
      let uptime_secs = start_time.elapsed().as_secs();
      let res_body = RootInfo {
        name: String::from("Corinth"),
        version: String::from("0.0.1"),
        uptime_secs,
        started_at: now - uptime_secs,
      };
      serde_json::to_value(res_body).map_err(|e| (StatusCode::InternalServerError, e))
    },
  );

  // Get queue info
  server.get(
    "/queue/:queue_name",
    middleware! { |req, mut res|
      let queue_map = QUEUES.lock().unwrap();
      let queue_name = String::from(req.param("queue_name").unwrap());
      let queue_maybe = queue_map.get(&queue_name);

      if queue_maybe.is_some() {
        let queue = queue_maybe.unwrap();
        let res_body = QueueInfoResponse {
          name: queue_name.clone(),
          size: queue.size() as u64,
        };
        serde_json::to_value(res_body).map_err(|e| (StatusCode::InternalServerError, e))
      }
      else {
        let res_body = ErrorResponse {
          error: true,
          message: String::from("Queue not found"),
        };
        res.set(StatusCode::NotFound);
        serde_json::to_value(res_body).map_err(|e| (StatusCode::InternalServerError, e))
      }
    },
  );

  // server.put(
  //   "/queue/:queue_name/:id"
  // );

  // Parse port from cli arguments
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
