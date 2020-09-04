use nickel::MiddlewareResult;
use nickel::Response;
use nickel::Request;
use crate::queue::Message;
use crate::date::elapsed_secs;
use crate::date::{iso_date, timestamp};
use crate::global_data::{queue_exists, QUEUES};
use crate::nickel::QueryString;
use crate::queue::Queue;
use crate::response::{error, success};
use nickel::status::StatusCode;
use nickel::{HttpRouter, JsonBody, Nickel};
use serde_json::{json, Value};
use std::path::Path;
use std::time::Instant;


#[derive(Serialize, Deserialize)]
struct NewItem {
  item: Value,
  deduplication_id: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct EnqueueBody {
  messages: Vec<NewItem>,
}

fn favicon_handler<'a, D>(_: &mut Request<D>, res: Response<'a, D>) -> MiddlewareResult<'a, D> {
  // https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html#foreground.type=clipart&foreground.clipart=settings_ethernet&foreground.space.trim=1&foreground.space.pad=0.45&foreColor=rgb(108%2C%20100%2C%2059)&backColor=rgb(231%2C%20216%2C%20139)&crop=0&backgroundShape=circle&effects=score&name=ic_launcher
  let favicon = Path::new("assets/favicon.png");
  res.send_file(favicon)
}

pub fn create_server() -> Nickel {
  let mut server = Nickel::new();
  let start_time = Instant::now();

  // Logger middleware
  server.utilize(middleware! { |req|
    println!("{} {}: {}", req.origin.method.to_string(), req.origin.uri.to_string(), iso_date());
  });
  
  server.get("/favicon.ico", favicon_handler);

  #[allow(unused_doc_comments)]
  /**
   * @api {get} / Get server info
   * @apiName RootInfo
   * @apiGroup Misc
   *
   * @apiSuccess {String} result:info:name Server name
   * @apiSuccess {String} result:info:version Server version
   * @apiSuccess {Number} result:info:uptime_ms Uptime in milliseconds
   * @apiSuccess {Number} result:info:uptime_secs Uptime in seconds
   * @apiSuccess {Number} result:info:started_at Unix timestamp when the server was started
   */
  server.get(
    "/",
    middleware! { |_req, mut res|
      let now = timestamp();
      let uptime_secs = elapsed_secs(start_time);
      success(&mut res, StatusCode::Ok, json!({
        "info": {
          "name": String::from("Corinth"),
          "version": String::from("0.0.1"),
          "uptime_ms": uptime_secs * 1000,
          "uptime_secs": uptime_secs,
          "started_at": now - uptime_secs,
        }
      }), String::from("Server info retrieved successfully"))
    },
  );

  #[allow(unused_doc_comments)]
  /**
   * @api {get} /queues List queues
   * @apiName ListQueues
   * @apiGroup Queue
   *
   * @apiSuccess {String} result:queues:items Queue names
   * @apiSuccess {Number} result:queues:length Amount of queues
   */
  server.get(
    "/queues",
    middleware! { |_req, mut res|
      let queue_map = QUEUES.lock().unwrap();
      let mut queue_names: Vec<String> = queue_map.keys().map(|key| key.clone()).collect();
      queue_names.sort();
      success(&mut res, StatusCode::Ok, json!({
        "queues": {
          "items": queue_names,
          "length": queue_names.len(),
        }
      }), String::from("Queue list retrieved successfully"))
    },
  );

  #[allow(unused_doc_comments)]
  /**
   * @api {get} /queues Get queue info
   * @apiName ListQueues
   * @apiGroup Queue
   *
   * @apiSuccess {String} result:queue:name Queue name
   * @apiSuccess {Number} result:queue:created_at Queue creation unix timestamp
   * @apiSuccess {Number} result:queue:size Queue size (length)
   * @apiSuccess {Number} result:queue:num_deduped Amount of tracked deduplication IDs
   * @apiSuccess {Number} result:queue:num_unacked Amount of unacknowledged messages
   * @apiSuccess {Number} result:queue:num_acknowledged Amount of acknowledged (done) messages
   * @apiSuccess {Number} result:queue:num_dedup_hits Amount of deduplicated items
   * @apiSuccess {Number} result:queue:dedup_time Time for deduplication ID to expire
   * @apiSuccess {Number} result:queue:ack_time Time for an unacknowledged message to get added back into the queue
   * @apiSuccess {String} result:queue:persistent Whether the queue is saved on disk
   * @apiSuccess {Number} result:queue:mem_size Approximate memory usage of the queue
   * 
   * @apiError 404 Queue not found
   */
  server.get(
    "/queue/:queue_name",
    middleware! { |req, mut res|
      if queue_exists(req) {
        let queue_name = String::from(req.param("queue_name").unwrap());
        let queue_map = QUEUES.lock().unwrap();
        let queue = queue_map.get(&queue_name).unwrap();
        success(&mut res, StatusCode::Ok, json!({
          "queue": {
            "name": queue_name,
            "created_at": queue.created_at(),
            "size": queue.size(),
            "num_deduped": queue.dedup_size(),
            "num_unacked": queue.ack_size(),
            "num_acknowledged": queue.num_acknowledged(),
            "num_dedup_hits": queue.num_dedup_hits(),
            "dedup_time": queue.dedup_time(),
            "ack_time": queue.ack_time(),
            "persistent": queue.is_persistent(),
            "mem_size": queue.get_mem_size(), 
          }
        }), String::from("Queue info retrieved successfully"))
      }
      else {
        error(&mut res, StatusCode::NotFound, "Queue not found")
      }
    },
  );

  #[allow(unused_doc_comments)]
  /**
   * @api {post} /queue/:queue/:message/ack Acknowledge message reception
   * @apiName AckMessage
   * @apiGroup Queue
   * 
   * @apiError 404 Message not found
   * @apiError 404 Queue not found
   */
  server.post(
    "/queue/:queue_name/:message/ack",
    middleware! { |req, mut res|
      if queue_exists(req) {
        let mut queue_map = QUEUES.lock().unwrap();
        let queue = queue_map.get_mut(&String::from(req.param("queue_name").unwrap())).unwrap();
        let ack_result = queue.ack(req.param("message").unwrap().into());
        if ack_result {
          success(&mut res, StatusCode::Ok, json!(null), String::from("Message reception acknowledged")) 
        }
        else {
          error(&mut res, StatusCode::NotFound, "Message not found")
        }
      }
      else {
        error(&mut res, StatusCode::NotFound, "Queue not found")
      }
    },
  );

  #[allow(unused_doc_comments)]
  /**
   * @api {post} /queue/:queue/enqueue Enqueue message(s)
   * @apiName EnqueueMessages
   * @apiGroup Queue
   * 
   * @apiParam {Array} body:messages List of messages: { item: Object, deduplication: Nullable<String> }
   * @apiParam {String} query:create_queue (Optional) Set to "true" to create queue if not found
   * @apiParam {String} query:persistent_queue (Optional) Set to "true" to make created queue persistent
   * 
   * @apiSuccess {Number} result:num_enqueued Amount of enqueued messages
   * @apiSuccess {Number} result:num_deduplicated Amount of deduplicated messages
   * @apiSuccess {Array} result:items Created messages
   * 
   * @apiError 400 Bad Request (malformed body)
   * @apiError 400 body.items is required to be of type Array<Object>
   * @apiError 404 Queue not found
   */
  server.post(
    "/queue/:queue_name/enqueue",
    middleware! { |req, mut res|
      let body = try_with!(res, {
        req.json_as::<EnqueueBody>().map_err(|e| (StatusCode::BadRequest, e))
      });

      let mut all_objects = true;

      for item in body.messages.iter() {
        if !item.item.is_object() {
          all_objects = false;
        }
      }
      
      if all_objects {
        let queue_name = String::from(req.param("queue_name").unwrap());

        if !queue_exists(req) {
          let query = req.query();
          let create_queue = query.get("create_queue");
          if create_queue.is_some() && create_queue.unwrap_or("false") == "true" {
            let persistent = query.get("persistent_queue").unwrap_or("false") == "true";
            let mut queue_map = QUEUES.lock().unwrap();
            let queue = Queue::new(
              queue_name.clone(),
              300,
              300,
              persistent
            );
            queue_map.insert(queue_name.clone(), queue);
          }
          else {
            return res.error(StatusCode::NotFound, "Queue not found");
          }
        }

        let mut queue_map = QUEUES.lock().unwrap();
        let queue = queue_map.get_mut(&queue_name).unwrap();

        let mut enqueued_items: Vec<Message> = Vec::new();
        let mut num_deduplicated = 0;

        for item in body.messages.iter() {
          let dup_item = item.clone();
          let dedup_id = dup_item.deduplication_id.clone();
          let dedup_id_as_string = if dedup_id.is_some() { Some(String::from(dedup_id.clone().unwrap())) } else { None };
          let msg = queue.try_enqueue(dup_item.item.clone(), dedup_id_as_string);
          if msg.is_some() {
            enqueued_items.push(msg.unwrap());
          }
          else {
            num_deduplicated += 1;
          }
        }
        
        success(&mut res, StatusCode::Accepted, json!({
          "num_enqueued": enqueued_items.len(),
          "num_deduplicated": num_deduplicated,
          "items": enqueued_items
        }), String::from("Request processed successfully"))
      }
      else {
        error(&mut res, StatusCode::BadRequest, "body.items is required to be of type Array<Object>")
      }
    },
  );

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
  server.post(
    "/queue/:queue_name/dequeue",
    middleware! { |req, mut res|
      if queue_exists(req) {
        let mut queue_map = QUEUES.lock().unwrap();
        let queue = queue_map.get_mut(&String::from(req.param("queue_name").unwrap())).unwrap();

        let query = req.query();
        let auto_ack = query.get("ack");
        let num_to_dequeue = query.get("amount").unwrap_or("1").parse::<u8>().map_err(|e| (StatusCode::BadRequest, e));
        let max = num_to_dequeue.unwrap();

        if max < 1 {
          error(&mut res, StatusCode::BadRequest, "Invalid amount parameter")
        }
        else {
          let mut dequeued_items: Vec<Message> = Vec::new();
        
          let mut i = 0;
  
          while i < max {
            let message = queue.dequeue(auto_ack.is_some() && auto_ack.unwrap() == "true");
            if message.is_some() {
              dequeued_items.push(message.unwrap());
              i += 1;
            }
            else {
              break;
            }
          }
  
          success(&mut res, StatusCode::Ok, json!({
            "items": dequeued_items,
            "num_items": dequeued_items.len(),
          }), String::from("Request processed successfully"))
        }
      }
      else {
        error(&mut res, StatusCode::NotFound, "Queue not found")
      }
    },
  );

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
  server.get(
    "/queue/:queue_name/peek",
    middleware! { |req, mut res|
      if queue_exists(req) {
        let mut queue_map = QUEUES.lock().unwrap();
        let queue = queue_map.get_mut(&String::from(req.param("queue_name").unwrap())).unwrap();
        let message = queue.peek();
        if message.is_some() {
          success(&mut res, StatusCode::Ok, json!({
            "item": message.unwrap()
          }), String::from("Message retrieved successfully"))
        }
        else {
          success(&mut res, StatusCode::Ok, json!({
            "item": null
          }), String::from("Queue is empty"))
        }
      }
      else {
        error(&mut res, StatusCode::NotFound, "Queue not found")
      }
    },
  );

  #[allow(unused_doc_comments)]
  /**
   * @api {put} /queue/:queue Create queue
   * @apiName CreateQueue
   * @apiGroup Queue
   * 
   * @apiParam {String} query:ack_time (Optional) Ack time in seconds
   * @apiParam {String} query:dedup_time (Optional) Deduplication time in seconds
   * @apiParam {String} query:persistent (Optional) Set to "true" to make queue persistent
   * 
   * @apiError 400 Invalid time argument
   */
  server.put(
    "/queue/:queue_name",
    middleware! { |req, mut res|
      if queue_exists(req) {
        error(&mut res, StatusCode::Conflict, "Queue already exists")
      }
      else {
        let queue_name = String::from(req.param("queue_name").unwrap());
        let query = req.query();
        let ack_time_str = query.get("ack_time").unwrap_or("300");
        let dedup_time_str = query.get("dedup_time").unwrap_or("300");
        let ack_time_result = ack_time_str.parse::<u32>().ok();
        let dedup_time_result = dedup_time_str.parse::<u32>().ok();
        let persistent = query.get("persistent").unwrap_or("false") == "true";

        if ack_time_result.is_none() || dedup_time_result.is_none() {
          return res.error(StatusCode::BadRequest, "Invalid time argument");
        }

        let mut queue_map = QUEUES.lock().unwrap();

        let queue = Queue::new(
          queue_name.clone(), 
          ack_time_result.unwrap(), 
          dedup_time_result.unwrap(),
          persistent
        );
        queue_map.insert(queue_name, queue);
        success(&mut res, StatusCode::Created, json!(null), String::from("Queue created successfully"))
      }
    },
  );

  server
}
