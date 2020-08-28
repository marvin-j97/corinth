#[macro_use]
extern crate nickel;
#[macro_use]
extern crate serde_derive;

mod queue;

use chrono::{DateTime, Local};
use lazy_static::lazy_static;
use nickel::status::StatusCode;
use nickel::{HttpRouter, JsonBody, Nickel, Request, Response};
use queue::Queue;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::fs;
use std::sync::Mutex;
use std::time::{Instant, SystemTime, UNIX_EPOCH};

#[derive(Serialize, Deserialize)]
struct EnqueueBody {
  item: Value,
}

#[derive(Serialize, Deserialize)]
struct SuccessResponse {
  result: Value,
}

#[derive(Serialize, Deserialize)]
struct ErrorResponse {
  error: bool,
  message: String,
}

lazy_static! {
  static ref QUEUES: Mutex<HashMap<String, Queue>> = {
    let mut map: HashMap<String, Queue> = HashMap::new();

    // TODO: DEBUG
    let test_name = String::from("abc");
    map.insert(test_name, Queue::new());

    Mutex::new(map)
  };
}

fn iso_date() -> String {
  let now: DateTime<Local> = Local::now();
  now.to_rfc2822()
}

fn queue_exists(req: &mut Request) -> bool {
  let queue_map = QUEUES.lock().unwrap();
  let queue_name = String::from(req.param("queue_name").unwrap());
  let queue_maybe = queue_map.get(&queue_name);
  queue_maybe.is_some()
}

fn success(result: Value) -> Result<Value, (nickel::status::StatusCode, serde_json::error::Error)> {
  let res_body = SuccessResponse { result };
  serde_json::to_value(res_body).map_err(|e| (StatusCode::InternalServerError, e))
}

fn error(
  res: &mut Response,
  status: StatusCode,
  message: &str,
) -> Result<Value, (nickel::status::StatusCode, serde_json::error::Error)> {
  let res_body = ErrorResponse {
    error: true,
    message: String::from(message),
  };
  res.set(status);
  serde_json::to_value(res_body).map_err(|e| (StatusCode::InternalServerError, e))
}

fn main() {
  fs::create_dir("corinth_data").ok();

  let mut server = Nickel::new();
  let start_time = Instant::now();

  // Logger middleware
  server.utilize(middleware! { |req|
    println!("{} {}: {}", req.origin.method.to_string(), req.origin.uri.to_string(), iso_date());
  });

  // Get server info
  server.get(
    "/",
    middleware! { |_req|
      let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
      let uptime_secs = start_time.elapsed().as_secs();
      serde_json::to_value(json!({
        "name": String::from("Corinth"),
        "version": String::from("0.0.1"),
        "uptime_ms": uptime_secs * 1000,
        "uptime_secs": uptime_secs,
        "started_at": now - uptime_secs,
      })).map_err(|e| (StatusCode::InternalServerError, e))
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
        success(json!({
          "name": queue_name,
          "size": queue.size()
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
          queue.enqueue(body.item);
          success(json!({
            "message": "Message enqueued"
          }))
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
          success(json!({
            "message": message.unwrap()
          }))
        }
        else {
          res.set(StatusCode::NoContent);
          return res.send("");
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
        res.set(StatusCode::Created);
        success(json!(null))
      }
    },
  );

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
