use crate::date::{elapsed_secs, timestamp};
use crate::env::get_compaction_interval;
use crate::global_data::get_start_time;
use crate::global_data::{queue_exists, QUEUES};
use crate::queue::{unwrap_message, Message, Queue, QueueDeadLetterSettings};
use crate::response::{format_error, format_success};
use actix_files::NamedFile;
use actix_web::{delete, get, patch, post, put, web, HttpRequest, HttpResponse};
use qstring::QString;
use serde_json::{json, Value};
use std::thread;
use std::time::Duration;

#[get("/dashboard")]
async fn index_handler() -> actix_web::Result<NamedFile> {
  Ok(NamedFile::open("dashboard/index.html")?)
}

#[get("/favicon.ico")]
async fn favicon_handler() -> actix_web::Result<NamedFile> {
  Ok(NamedFile::open("assets/favicon.png")?)
}

#[allow(unused_doc_comments)]
/**
 * @api {get} / Get server info
 * @apiName RootInfo
 * @apiGroup Server
 *
 * @apiSuccess {String} result:info:name Server name
 * @apiSuccess {String} result:info:version Server version
 * @apiSuccess {Number} result:info:uptime_ms Uptime in milliseconds
 * @apiSuccess {Number} result:info:uptime_secs Uptime in seconds
 * @apiSuccess {Number} result:info:started_at Unix timestamp when the server was started
 */
#[get("/")]
async fn server_info_handler() -> HttpResponse {
  let now = timestamp();
  let uptime_secs = elapsed_secs(get_start_time());
  let info = json!({
    "info": {
      "name": String::from("Corinth"),
      "version": String::from("0.4.0"),
      "uptime_ms": uptime_secs * 1000,
      "uptime_secs": uptime_secs,
      "started_at": now - uptime_secs,
    }
  });
  HttpResponse::Ok()
    .content_type("application/json")
    .body(format_success(
      200,
      String::from("Server info retrieved successfully"),
      info,
    ))
}

fn format_queue_info(queue: &Queue) -> Value {
  json!({
    "name": queue.get_name(),
    "created_at": queue.created_at(),
    "size": queue.size(),
    "num_deduplicating": queue.dedup_size(),
    "num_unacknowledged": queue.ack_size(),
    "num_acknowledged": queue.num_acknowledged(),
    "num_deduplicated": queue.num_deduplicated(),
    "deduplication_time": queue.deduplication_time(),
    "requeue_time": queue.requeue_time(),
    "max_length": queue.max_length(),
    "persistent": queue.is_persistent(),
    "memory_size": queue.get_memory_size(),
    "num_requeued": queue.num_requeued(),
    "dead_letter": queue.get_meta().dead_letter_queue
  })
}

#[allow(unused_doc_comments)]
/**
 * @api {get} /queues List queues
 * @apiName ListQueues
 * @apiGroup Queue
 *
 * @apiSuccess {String} result:queues:items Queue names
 * @apiSuccess {Number} result:queues:length Amount of queues
 */
#[get("/queues")]
async fn list_queues_handler() -> HttpResponse {
  let queue_map = QUEUES.lock().unwrap();
  let queue_info: Vec<Value> = queue_map.values().map(format_queue_info).collect();

  HttpResponse::Ok()
    .content_type("application/json")
    .body(format_success(
      200,
      String::from("Queue list retrieved successfully"),
      json!({
        "queues": {
          "items": queue_info,
          "length": queue_info.len(),
        }
      }),
    ))
}

#[allow(unused_doc_comments)]
/**
 * @api {get} /queue/:queue_name Get queue info
 * @apiName GetQueue
 * @apiGroup Queue
 *
 * @apiSuccess {String} result:queue:name Queue name
 * @apiSuccess {Number} result:queue:created_at Queue creation unix timestamp
 * @apiSuccess {Number} result:queue:size Queue size (length)
 * @apiSuccess {Number} result:queue:num_deduplicating Amount of tracked deduplication IDs
 * @apiSuccess {Number} result:queue:num_unacknowledged Amount of unacknowledged messages
 * @apiSuccess {Number} result:queue:num_acknowledged Amount of acknowledged (done) messages
 * @apiSuccess {Number} result:queue:num_deduplicated Amount of deduplicated items
 * @apiSuccess {Number} result:queue:deduplication_time Time for deduplication ID to expire
 * @apiSuccess {Number} result:queue:requeue_time Time for an unacknowledged message to get added back into the queue
 * @apiSuccess {Number} result:queue:max_length Queue max length
 * @apiSuccess {String} result:queue:persistent Whether the queue is saved on disk
 * @apiSuccess {Number} result:queue:dead_letter:name Dead letter queue target
 * @apiSuccess {Number} result:queue:dead_letter:threshold Dead letter queue threshold
 * @apiSuccess {Number} result:queue:memory_size Approximate memory usage of the queue
 *
 * @apiError 404 Queue not found
 */
#[get("/queue/{queue_name}")]
async fn get_queue_handler(req: HttpRequest) -> HttpResponse {
  // let queue_name: String = req.match_info().query("queue_name").parse().unwrap();

  if queue_exists(&req) {
    let queue_name: String = req.match_info().query("queue_name").parse().unwrap();
    let queue_map = QUEUES.lock().unwrap();
    let queue = queue_map.get(&queue_name).unwrap();

    HttpResponse::Ok()
      .content_type("application/json")
      .body(format_success(
        200,
        String::from("Queue info retrieved successfully"),
        json!({ "queue": format_queue_info(queue) }),
      ))
  } else {
    HttpResponse::NotFound()
      .content_type("application/json")
      .body(format_error(404, String::from("Queue not found")))
  }
}

#[allow(unused_doc_comments)]
/**
 * @api {put} /queue/:queue Create queue
 * @apiName CreateQueue
 * @apiGroup Queue
 *
 * @apiParam {String} query:requeue_time (Optional) Ack time in seconds
 * @apiParam {String} query:deduplication_time (Optional) Deduplication time in seconds
 * @apiParam {String} query:persistent (Optional) Set to "true" to make queue persistent
 * @apiParam {String} query:max_length (Optional) Queue max length
 * @apiParam {String} query:dead_letter_queue_name (Optional) Dead letter queue target
 * @apiParam {String} query:dead_letter_queue_threshold (Optional) Dead letter queue requeue threshold (default: 3)
 *
 * @apiError 400 Invalid time argument
 * @apiError 409 Queue already exists
 */
#[put("/queue/{queue_name}")]
async fn create_queue_handler(req: HttpRequest) -> HttpResponse {
  if queue_exists(&req) {
    return HttpResponse::Conflict()
      .content_type("application/json")
      .body(format_error(409, String::from("Queue already exists")));
  } else {
    let queue_name: String = req.match_info().query("queue_name").parse().unwrap();
    if queue_name.is_empty() || queue_name.len() > 64 {
      return HttpResponse::BadRequest()
        .content_type("application/json")
        .body(format_error(400, String::from("Invalid queue name")));
    }

    let query_str = req.query_string();
    let qs = QString::from(query_str);
    let requeue_time_str = qs.get("requeue_time").unwrap_or("300");
    let deduplication_time_str = qs.get("deduplication_time").unwrap_or("300");
    let max_length_str = qs.get("max_length").unwrap_or("0");

    let requeue_time_result = requeue_time_str.parse::<u32>().ok();
    let deduplication_time_result = deduplication_time_str.parse::<u32>().ok();
    let max_length_result = max_length_str.parse::<u64>().ok();

    let persistent = qs.get("persistent").unwrap_or("true") == "true";

    if requeue_time_result.is_none() || deduplication_time_result.is_none() {
      return HttpResponse::BadRequest()
        .content_type("application/json")
        .body(format_error(400, String::from("Invalid time argument")));
    }

    let mut queue_map = QUEUES.lock().unwrap();

    let dead_letter_queue_name = qs.get("dead_letter_queue_name");

    if dead_letter_queue_name.is_some() {
      // Search for dead letter queue
      // If not found, error with 404 // TODO: or 400?
      let dead_letter_queue = queue_map.get(&String::from(dead_letter_queue_name.unwrap()));
      if dead_letter_queue.is_none() {
        return HttpResponse::NotFound()
          .content_type("application/json")
          .body(format_error(
            404,
            String::from("Dead letter target not found"),
          ));
      }
    }

    let dead_letter_queue_threshold = qs
      .get("dead_letter_queue_threshold")
      .unwrap_or("3")
      .parse::<u16>()
      .ok();

    let dead_letter_queue = if dead_letter_queue_name.is_some() {
      Some(QueueDeadLetterSettings {
        name: String::from(dead_letter_queue_name.unwrap()),
        threshold: dead_letter_queue_threshold.unwrap(),
      })
    } else {
      None
    };

    let mut queue = Queue::new(
      queue_name.clone(),
      requeue_time_result.unwrap(),
      deduplication_time_result.unwrap(),
      persistent,
      max_length_result.unwrap(),
      dead_letter_queue,
    );
    queue.start_compact_interval(get_compaction_interval());
    queue_map.insert(queue_name.clone(), queue);

    HttpResponse::Created()
      .content_type("application/json")
      .body(format_success(
        201,
        String::from("Queue created successfully"),
        json!(null),
      ))
  }
}

#[derive(Serialize, Deserialize)]
struct NewItem {
  item: Value,
  deduplication_id: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct EnqueueBody {
  messages: Vec<NewItem>,
}

fn are_all_objects(vec: &Vec<NewItem>) -> bool {
  let mut all_objects = true;

  for item in vec.iter() {
    if !item.item.is_object() {
      all_objects = false;
    }
  }

  all_objects
}

#[allow(unused_doc_comments)]
/**
 * @api {post} /queue/:queue/enqueue Enqueue message(s)
 * @apiName EnqueueMessages
 * @apiGroup Queue
 *
 * @apiParam {Array} body:messages List of messages: { item: Object, deduplication: Nullable<String> }
 *
 * @apiSuccess {Number} result:num_enqueued Amount of enqueued messages
 * @apiSuccess {Number} result:num_deduplicated Amount of deduplicated messages
 * @apiSuccess {Array} result:items Created messages
 *
 * @apiError 400 Bad Request
 * @apiError 404 Queue not found
 */
#[post("/queue/{queue_name}/enqueue")]
async fn enqueue_handler(info: web::Json<EnqueueBody>, req: HttpRequest) -> HttpResponse {
  let body = &info;

  if body.messages.len() < 256 && are_all_objects(&body.messages) {
    let queue_name: String = req.match_info().query("queue_name").parse().unwrap();
    if queue_name.is_empty() || queue_name.len() > 64 {
      return HttpResponse::BadRequest()
        .content_type("application/json")
        .body(format_error(400, String::from("Invalid queue name")));
    }

    if !queue_exists(&req) {
      return HttpResponse::NotFound()
        .content_type("application/json")
        .body(format_error(404, String::from("Queue not found")));
    }

    let mut queue_map = QUEUES.lock().unwrap();
    let queue = queue_map.get_mut(&queue_name).unwrap();

    if !queue.can_fit_messages(body.messages.len() as u64) {
      return HttpResponse::Forbidden()
        .content_type("application/json")
        .body(format_error(403, String::from("Queue is full")));
    }

    let mut enqueued_items: Vec<Message> = Vec::new();
    let mut num_deduplicated = 0;

    for item in body.messages.iter() {
      let dup_item = item.clone();
      let dedup_id = dup_item.deduplication_id.clone();
      let dedup_id_as_string = if dedup_id.is_some() {
        Some(String::from(dedup_id.clone().unwrap()))
      } else {
        None
      };
      let msg = queue.try_enqueue(dup_item.item.clone(), dedup_id_as_string);
      if msg.is_some() {
        enqueued_items.push(msg.unwrap());
      } else {
        num_deduplicated += 1;
      }
    }
    let unwrapped_vec: Vec<Value> = enqueued_items.into_iter().map(unwrap_message).collect();

    return HttpResponse::Accepted()
      .content_type("application/json")
      .body(format_success(
        202,
        String::from("Request processed successfully"),
        json!({
          "num_enqueued": unwrapped_vec.len(),
          "num_deduplicated": num_deduplicated,
          "items": unwrapped_vec
        }),
      ));
  } else {
    return HttpResponse::BadRequest()
    .content_type("application/json")
    .body(format_error(400, String::from("body.items is required to be of type Array<{ item: String, deduplication_id: String? }> with at most 255 items")));
  }
}

#[post("/queue/{queue_name}/{message}/ack")]
async fn ack_handler(req: HttpRequest) -> HttpResponse {
  if queue_exists(&req) {
    let mut queue_map = QUEUES.lock().unwrap();

    let queue_name: String = req.match_info().query("queue_name").parse().unwrap();
    let message_id: String = req.match_info().query("message").parse().unwrap();

    let queue = queue_map.get_mut(&queue_name).unwrap();
    let ack_result = queue.ack(message_id);

    if ack_result {
      HttpResponse::Ok()
        .content_type("application/json")
        .body(format_success(
          200,
          String::from("Message reception acknowledged"),
          json!(null),
        ))
    } else {
      HttpResponse::NotFound()
        .content_type("application/json")
        .body(format_error(404, String::from("Message not found")))
    }
  } else {
    HttpResponse::NotFound()
      .content_type("application/json")
      .body(format_error(404, String::from("Queue not found")))
  }
}

#[allow(unused_doc_comments)]
/**
 * @api {get} /queue/:queue/peek Peek queue head
 * @apiName PeekQueue
 * @apiGroup Queue
 *
 * @apiSuccess {Array} result:item Queue head
 *
 * @apiError 404 Queue not found
 */
#[get("/queue/{queue_name}/peek")]
async fn peek_handler(req: HttpRequest) -> HttpResponse {
  if queue_exists(&req) {
    let mut queue_map = QUEUES.lock().unwrap();
    let queue_name: String = req.match_info().query("queue_name").parse().unwrap();
    let queue = queue_map.get_mut(&queue_name).unwrap();

    let message = queue.peek();

    if message.is_some() {
      return HttpResponse::Ok()
        .content_type("application/json")
        .body(format_success(
          202,
          String::from("Message retrieved successfully"),
          json!({
            "item": unwrap_message(message.unwrap())
          }),
        ));
    } else {
      return HttpResponse::Ok()
        .content_type("application/json")
        .body(format_success(
          202,
          String::from("Queue is empty"),
          json!({ "item": null }),
        ));
    }
  } else {
    HttpResponse::NotFound()
      .content_type("application/json")
      .body(format_error(404, String::from("Queue not found")))
  }
}

#[allow(unused_doc_comments)]
/**
 * @api {post} /queue/:queue/dequeue Dequeue message(s)
 * @apiName DequeueMessages
 * @apiGroup Queue
 *
 * @apiParam {String} query:ack (Optional) Set to "true" to automatically acknowledge message(s)
 * @apiParam {String} query:amount (Optional) Amount of items to dequeue and return
 *
 * @apiSuccess {Array} result:items Dequeued messages
 * @apiSuccess {Array} result:num_items Amount of dequeued messages
 *
 * @apiError 400 Invalid amount parameter
 * @apiError 404 Queue not found
 */
#[post("/queue/{queue_name}/dequeue")]
async fn dequeue_handler(req: HttpRequest) -> HttpResponse {
  if queue_exists(&req) {
    let mut queue_map = QUEUES.lock().unwrap();
    let queue_name: String = req.match_info().query("queue_name").parse().unwrap();
    let queue = queue_map.get_mut(&queue_name).unwrap();

    let query_str = req.query_string();
    let qs = QString::from(query_str);
    let auto_ack = qs.get("ack").unwrap_or("false");
    let num_to_dequeue = qs.get("amount").unwrap_or("1").parse::<u8>().unwrap_or(1);
    let max = num_to_dequeue;

    if max < 1 {
      HttpResponse::BadRequest()
        .content_type("application/json")
        .body(format_error(400, String::from("Invalid amount parameter")))
    } else {
      let mut dequeued_items: Vec<Message> = Vec::new();
      let mut i = 0;

      while i < max {
        let message = queue.dequeue(auto_ack == "true");
        if message.is_some() {
          dequeued_items.push(message.unwrap());
          i += 1;
        } else {
          break;
        }
      }

      let unwrapped_vec: Vec<Value> = dequeued_items.into_iter().map(unwrap_message).collect();

      HttpResponse::Ok()
        .content_type("application/json")
        .body(format_success(
          200,
          String::from("Request processed successfully"),
          json!({
            "items": unwrapped_vec,
            "num_items": unwrapped_vec.len(),
          }),
        ))
    }
  } else {
    HttpResponse::NotFound()
      .content_type("application/json")
      .body(format_error(404, String::from("Queue not found")))
  }
}

#[derive(Serialize, Deserialize)]
struct QueuePatchBody {
  requeue_time: Option<u32>,
  deduplication_time: Option<u32>,
  max_length: Option<u64>,
}

#[allow(unused_doc_comments)]
/**
 * @api {patch} /queue/:queue Edit queue
 * @apiName EditQueue
 * @apiGroup Queue
 *
 * @apiParam {String} body:requeue_time (Optional) Ack time in seconds
 * @apiParam {String} body:deduplication_time (Optional) Deduplication time in seconds
 * @apiParam {String} body:max_length (Optional) Queue max length
 *
 * @apiError 400 Invalid input
 * @apiError 404 Queue not found
 */
#[patch("/queue/{queue_name}")]
async fn edit_queue_handler(info: web::Json<QueuePatchBody>, req: HttpRequest) -> HttpResponse {
  let body = info;

  let queue_name: String = req.match_info().query("queue_name").parse().unwrap();

  if queue_name.is_empty() {
    return HttpResponse::BadRequest()
      .content_type("application/json")
      .body(format_error(400, String::from("Invalid queue name")));
  }

  if !queue_exists(&req) {
    return HttpResponse::NotFound()
      .content_type("application/json")
      .body(format_error(404, String::from("Queue not found")));
  }

  let mut queue_map = QUEUES.lock().unwrap();
  let queue = queue_map.get_mut(&queue_name).unwrap();

  if body.deduplication_time.is_some() {
    let value = body.deduplication_time.unwrap();
    eprintln!("{}: Setting deduplication_time to {}", queue_name, value);
    queue.set_deduplication_time(value);
  }

  if body.requeue_time.is_some() {
    let value = body.requeue_time.unwrap();
    eprintln!("{}: Setting requeue_time to {}", queue_name, value);
    queue.set_requeue_time(body.requeue_time.unwrap());
  }

  if body.max_length.is_some() {
    let value = body.max_length.unwrap();
    eprintln!("{}: Setting max_length to {}", queue_name, value);
    queue.set_max_length(body.max_length.unwrap());
  }

  if queue.is_persistent() {
    queue.write_metadata();
  }

  HttpResponse::Ok()
    .content_type("application/json")
    .body(format_success(
      200,
      String::from("Queue edited successfully"),
      json!(null),
    ))
}

#[allow(unused_doc_comments)]
/**
 * @api {post} /queue/:queue/compact Compact queue file
 * @apiName CompactQueue
 * @apiGroup Queue
 *
 * @apiError 404 Queue not found
 */
#[post("/queue/{queue_name}/compact")]
async fn compact_handler(req: HttpRequest) -> HttpResponse {
  if !queue_exists(&req) {
    return HttpResponse::NotFound()
      .content_type("application/json")
      .body(format_error(404, String::from("Queue not found")));
  } else {
    let mut queue_map = QUEUES.lock().unwrap();

    let queue_name: String = req.match_info().query("queue_name").parse().unwrap();
    let queue = queue_map.get_mut(&queue_name).unwrap();

    if !queue.is_persistent() {
      return HttpResponse::Forbidden()
        .content_type("application/json")
        .body(format_error(
          403,
          String::from("Nothing to compact: queue is not persistent"),
        ));
    }

    queue.compact();

    HttpResponse::Ok()
      .content_type("application/json")
      .body(format_success(
        200,
        String::from("Queue compacted successfully"),
        json!(null),
      ))
  }
}

// TODO: should probably be POST
#[allow(unused_doc_comments)]
/**
 * @api {delete} /queue/:queue/purge Purge queue
 * @apiName PurgeQueue
 * @apiGroup Queue
 *
 * @apiError 404 Queue not found
 */
#[delete("/queue/{queue_name}/purge")]
async fn purge_handler(req: HttpRequest) -> HttpResponse {
  if !queue_exists(&req) {
    return HttpResponse::NotFound()
      .content_type("application/json")
      .body(format_error(404, String::from("Queue not found")));
  } else {
    let mut queue_map = QUEUES.lock().unwrap();

    let queue_name: String = req.match_info().query("queue_name").parse().unwrap();
    let queue = queue_map.get_mut(&queue_name).unwrap();
    queue.purge(false);

    HttpResponse::Ok()
      .content_type("application/json")
      .body(format_success(
        200,
        String::from("Queue purged successfully"),
        json!(null),
      ))
  }
}

fn is_dead_letter_queue(queues: Vec<&Queue>, queue_name: &String) -> bool {
  queues.iter().any(|x| {
    let meta = x.get_meta();
    if meta.dead_letter_queue.is_some() {
      if meta.dead_letter_queue.unwrap().name == *queue_name {
        return true;
      }
    }
    false
  })
}

#[allow(unused_doc_comments)]
/**
 * @api {delete} /queue/:queue Delete queue
 * @apiName DeleteQueue
 * @apiGroup Queue
 *
 * @apiError 404 Queue not found
 */
#[delete("/queue/{queue_name}")]
async fn delete_handler(req: HttpRequest) -> HttpResponse {
  if !queue_exists(&req) {
    return HttpResponse::NotFound()
      .content_type("application/json")
      .body(format_error(404, String::from("Queue not found")));
  } else {
    let mut queue_map = QUEUES.lock().unwrap();

    let queue_name: String = req.match_info().query("queue_name").parse().unwrap();

    if is_dead_letter_queue(queue_map.values().collect(), &queue_name) {
      return HttpResponse::Forbidden()
        .content_type("application/json")
        .body(format_error(
          403,
          String::from("Dead letter queue is in use"),
        ));
    }

    let mut queue = queue_map.remove(&queue_name).unwrap();
    queue.purge(true);

    HttpResponse::Ok()
      .content_type("application/json")
      .body(format_success(
        200,
        String::from("Queue deleted successfully"),
        json!(null),
      ))
  }
}

#[allow(unused_doc_comments)]
/**
 * @api {post} /close Shuts down server
 * @apiName ShutdownServer
 * @apiGroup Server
 */
#[post("/close")]
async fn close_handler() -> HttpResponse {
  thread::spawn(move || {
    eprintln!("Shutting down in 3 seconds...");
    thread::sleep(Duration::from_secs(3));
    eprintln!("Shutting down.");
    std::process::exit(0);
  });

  // TODO: 202 Accepted?
  HttpResponse::Ok()
    .content_type("application/json")
    .body(format_success(
      200,
      String::from("Server shuts down in 3 seconds"),
      json!(null),
    ))
}
