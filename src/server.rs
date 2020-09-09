use crate::date::elapsed_secs;
use crate::date::timestamp;
use crate::response::format_success;
use crate::routes::{
  ack_message, create_queue_handler, dequeue_handler, enqueue_handler, favicon_handler,
  list_queues, logger, peek_handler, queue_info,
};
use nickel::status::StatusCode;
use nickel::{HttpRouter, MediaType, Nickel};
use serde_json::json;
use std::time::Instant;

pub fn create_server() -> Nickel {
  let mut server = Nickel::new();
  let start_time = Instant::now();

  // Logger middleware
  server.utilize(logger);
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
      res.set(MediaType::Json);
      res.set(StatusCode::Ok);
      format_success( StatusCode::Ok,String::from("Server info retrieved successfully"), json!({
        "info": {
          "name": String::from("Corinth"),
          "version": String::from("0.0.1"),
          "uptime_ms": uptime_secs * 1000,
          "uptime_secs": uptime_secs,
          "started_at": now - uptime_secs,
        }
      }))
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
  server.get("/queues", list_queues);

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
  server.get("/queue/:queue_name", queue_info);

  #[allow(unused_doc_comments)]
  /**
   * @api {post} /queue/:queue/:message/ack Acknowledge message reception
   * @apiName AckMessage
   * @apiGroup Queue
   *
   * @apiError 404 Message not found
   * @apiError 404 Queue not found
   */
  server.post("/queue/:queue_name/:message/ack", ack_message);

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
  server.post("/queue/:queue_name/enqueue", enqueue_handler);

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
  server.post("/queue/:queue_name/dequeue", dequeue_handler);

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
  server.get("/queue/:queue_name/peek", peek_handler);

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
   * @apiError 409 Queue already exists
   */
  server.put("/queue/:queue_name", create_queue_handler);

  server
}
