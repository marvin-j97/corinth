use crate::date::iso_date;
use crate::env::get_compaction_interval;
use crate::global_data::{queue_exists, QUEUES};
use crate::queue::{unwrap_message, Message, Queue, QueueDeadLetterSettings};
use crate::response::{format_error, format_success};
use nickel::status::StatusCode;
use nickel::MiddlewareResult;
use nickel::Request;
use nickel::{JsonBody, MediaType, QueryString, Response};
use serde_json::{json, Value};
use std::path::Path;

#[derive(Serialize, Deserialize)]
struct NewItem {
  item: Value,
  deduplication_id: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct EnqueueBody {
  messages: Vec<NewItem>,
}

#[derive(Serialize, Deserialize)]
struct QueuePatchBody {
  requeue_time: Option<u32>,
  deduplication_time: Option<u32>,
  max_length: Option<u64>,
}

pub fn logger<'mw>(req: &mut Request, res: Response<'mw>) -> MiddlewareResult<'mw> {
  eprintln!(
    "{} {}: {}",
    req.origin.method.to_string(),
    req.origin.uri.to_string(),
    iso_date()
  );
  res.next_middleware()
}

pub fn favicon_handler<'a, D>(_: &mut Request<D>, res: Response<'a, D>) -> MiddlewareResult<'a, D> {
  // https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html#foreground.type=clipart&foreground.clipart=settings_ethernet&foreground.space.trim=1&foreground.space.pad=0.45&foreColor=rgb(108%2C%20100%2C%2059)&backColor=rgb(231%2C%20216%2C%20139)&crop=0&backgroundShape=circle&effects=score&name=ic_launcher
  let favicon = Path::new("assets/favicon.png");
  res.send_file(favicon)
}

pub fn peek_handler<'mw>(req: &mut Request, mut res: Response<'mw>) -> MiddlewareResult<'mw> {
  if queue_exists(req) {
    let mut queue_map = QUEUES.lock().unwrap();
    let queue = queue_map
      .get_mut(&String::from(req.param("queue_name").unwrap()))
      .unwrap();
    let message = queue.peek();
    if message.is_some() {
      res.set(MediaType::Json);
      res.set(StatusCode::Ok);
      return res.send(format_success(
        StatusCode::Ok,
        String::from("Message retrieved successfully"),
        json!({
          "item": unwrap_message(message.unwrap())
        }),
      ));
    } else {
      res.set(MediaType::Json);
      res.set(StatusCode::Ok);
      return res.send(format_success(
        StatusCode::Ok,
        String::from("Queue is empty"),
        json!({ "item": null }),
      ));
    }
  } else {
    res.set(MediaType::Json);
    res.set(StatusCode::NotFound);
    return res.send(format_error(
      StatusCode::NotFound,
      String::from("Queue not found"),
    ));
  }
}

pub fn dequeue_handler<'mw>(req: &mut Request, mut res: Response<'mw>) -> MiddlewareResult<'mw> {
  if queue_exists(req) {
    let mut queue_map = QUEUES.lock().unwrap();
    let queue = queue_map
      .get_mut(&String::from(req.param("queue_name").unwrap()))
      .unwrap();

    let query = req.query();
    let auto_ack = query.get("ack").unwrap_or("false");
    let num_to_dequeue = query
      .get("amount")
      .unwrap_or("1")
      .parse::<u8>()
      .map_err(|e| (StatusCode::BadRequest, e));
    let max = num_to_dequeue.unwrap();

    if max < 1 {
      res.set(MediaType::Json);
      res.set(StatusCode::NotFound);
      return res.send(format_error(
        StatusCode::NotFound,
        String::from("Invalid amount parameter"),
      ));
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

      res.set(MediaType::Json);
      res.set(StatusCode::Ok);
      return res.send(format_success(
        StatusCode::Ok,
        String::from("Request processed successfully"),
        json!({
          "items": unwrapped_vec,
          "num_items": unwrapped_vec.len(),
        }),
      ));
    }
  } else {
    res.set(MediaType::Json);
    res.set(StatusCode::NotFound);
    return res.send(format_error(
      StatusCode::NotFound,
      String::from("Queue not found"),
    ));
  }
}

pub fn patch_queue_handler<'mw>(
  req: &mut Request,
  mut res: Response<'mw>,
) -> MiddlewareResult<'mw> {
  let body = try_with!(res, {
    req
      .json_as::<QueuePatchBody>()
      .map_err(|e| (StatusCode::BadRequest, e))
  });

  let queue_name = String::from(req.param("queue_name").unwrap());
  if queue_name.is_empty() {
    return res.send(format_error(
      StatusCode::BadRequest,
      String::from("Invalid queue name"),
    ));
  }

  if !queue_exists(req) {
    res.set(MediaType::Json);
    res.set(StatusCode::NotFound);
    return res.send(format_error(
      StatusCode::NotFound,
      String::from("Queue not found"),
    ));
  }

  let mut queue_map = QUEUES.lock().unwrap();
  let queue = queue_map.get_mut(&queue_name).unwrap();

  if body.deduplication_time.is_some() {
    queue.set_deduplication_time(body.deduplication_time.unwrap());
  }

  if body.requeue_time.is_some() {
    queue.set_requeue_time(body.requeue_time.unwrap());
  }

  if body.max_length.is_some() {
    queue.set_max_length(body.max_length.unwrap());
  }

  if queue.is_persistent() {
    queue.write_metadata();
  }

  res.set(MediaType::Json);
  res.set(StatusCode::Ok);
  return res.send(format_success(
    StatusCode::Ok,
    String::from("Queue edited successfully"),
    json!(null),
  ));
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

pub fn enqueue_handler<'mw>(req: &mut Request, mut res: Response<'mw>) -> MiddlewareResult<'mw> {
  let body = try_with!(res, {
    req
      .json_as::<EnqueueBody>()
      .map_err(|e| (StatusCode::BadRequest, e))
  });

  if body.messages.len() < 256 && are_all_objects(&body.messages) {
    let queue_name = String::from(req.param("queue_name").unwrap());
    if queue_name.is_empty() {
      return res.send(format_error(
        StatusCode::BadRequest,
        String::from("Invalid queue name"),
      ));
    }

    if !queue_exists(req) {
      res.set(MediaType::Json);
      res.set(StatusCode::NotFound);
      return res.send(format_error(
        StatusCode::NotFound,
        String::from("Queue not found"),
      ));
    }

    let mut queue_map = QUEUES.lock().unwrap();
    let queue = queue_map.get_mut(&queue_name).unwrap();

    if !queue.can_fit_messages(body.messages.len() as u64) {
      res.set(MediaType::Json);
      res.set(StatusCode::Forbidden);
      return res.send(format_error(
        StatusCode::Forbidden,
        String::from("Queue is full"),
      ));
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

    res.set(MediaType::Json);
    res.set(StatusCode::Accepted);
    return res.send(format_success(
      StatusCode::Accepted,
      String::from("Request processed successfully"),
      json!({
        "num_enqueued": unwrapped_vec.len(),
        "num_deduplicated": num_deduplicated,
        "items": unwrapped_vec
      }),
    ));
  } else {
    res.set(MediaType::Json);
    res.set(StatusCode::BadRequest);
    return res.send(format_error(
      StatusCode::BadRequest,
      String::from("body.items is required to be of type Array<{ item: String, deduplication_id: String? }> with at most 255 items"),
    ));
  }
}

pub fn ack_message<'mw>(req: &mut Request, mut res: Response<'mw>) -> MiddlewareResult<'mw> {
  if queue_exists(req) {
    let mut queue_map = QUEUES.lock().unwrap();
    let queue = queue_map
      .get_mut(&String::from(req.param("queue_name").unwrap()))
      .unwrap();
    let ack_result = queue.ack(req.param("message").unwrap().into());
    if ack_result {
      res.set(MediaType::Json);
      res.set(StatusCode::Ok);
      return res.send(format_success(
        StatusCode::Ok,
        String::from("Message reception acknowledged"),
        json!(null),
      ));
    } else {
      res.set(MediaType::Json);
      res.set(StatusCode::NotFound);
      return res.send(format_error(
        StatusCode::NotFound,
        String::from("Message not found"),
      ));
    }
  } else {
    res.set(MediaType::Json);
    res.set(StatusCode::NotFound);
    return res.send(format_error(
      StatusCode::NotFound,
      String::from("Queue not found"),
    ));
  }
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

pub fn queue_info<'mw>(req: &mut Request, mut res: Response<'mw>) -> MiddlewareResult<'mw> {
  if queue_exists(req) {
    let queue_name = String::from(req.param("queue_name").unwrap());
    let queue_map = QUEUES.lock().unwrap();
    let queue = queue_map.get(&queue_name).unwrap();

    res.set(MediaType::Json);
    res.set(StatusCode::Ok);
    return res.send(format_success(
      StatusCode::Ok,
      String::from("Queue info retrieved successfully"),
      json!({ "queue": format_queue_info(queue) }),
    ));
  } else {
    res.set(MediaType::Json);
    res.set(StatusCode::NotFound);
    return res.send(format_error(
      StatusCode::NotFound,
      String::from("Queue not found"),
    ));
  }
}

pub fn list_queues<'mw>(_req: &mut Request, mut res: Response<'mw>) -> MiddlewareResult<'mw> {
  let queue_map = QUEUES.lock().unwrap();
  let queue_info: Vec<Value> = queue_map.values().map(format_queue_info).collect();

  res.set(MediaType::Json);
  res.set(StatusCode::Ok);
  return res.send(format_success(
    StatusCode::Ok,
    String::from("Queue list retrieved successfully"),
    json!({
      "queues": {
        "items": queue_info,
        "length": queue_info.len(),
      }
    }),
  ));
}

pub fn create_queue_handler<'mw>(
  req: &mut Request,
  mut res: Response<'mw>,
) -> MiddlewareResult<'mw> {
  if queue_exists(req) {
    res.set(MediaType::Json);
    res.set(StatusCode::Conflict);
    return res.send(format_error(
      StatusCode::Conflict,
      String::from("Queue already exists"),
    ));
  } else {
    let queue_name = String::from(req.param("queue_name").unwrap());
    if queue_name.is_empty() || queue_name.len() > 64 {
      res.set(MediaType::Json);
      res.set(StatusCode::BadRequest);
      return res.send(format_error(
        StatusCode::BadRequest,
        String::from("Invalid queue name"),
      ));
    }

    let query = req.query();
    let requeue_time_str = query.get("requeue_time").unwrap_or("300");
    let deduplication_time_str = query.get("deduplication_time").unwrap_or("300");
    let max_length_str = query.get("max_length").unwrap_or("0");

    let requeue_time_result = requeue_time_str.parse::<u32>().ok();
    let deduplication_time_result = deduplication_time_str.parse::<u32>().ok();
    let max_length_result = max_length_str.parse::<u64>().ok();

    let persistent = query.get("persistent").unwrap_or("true") == "true";

    if requeue_time_result.is_none() || deduplication_time_result.is_none() {
      res.set(MediaType::Json);
      res.set(StatusCode::BadRequest);
      return res.send(format_error(
        StatusCode::BadRequest,
        String::from("Invalid time argument"),
      ));
    }

    let mut queue_map = QUEUES.lock().unwrap();

    let dead_letter_queue_name = query.get("dead_letter_queue_name");

    if dead_letter_queue_name.is_some() {
      let dead_letter_queue = queue_map.get(&String::from(dead_letter_queue_name.unwrap()));
      if dead_letter_queue.is_none() {
        res.set(MediaType::Json);
        res.set(StatusCode::NotFound);
        return res.send(format_error(
          StatusCode::NotFound,
          String::from("Dead letter target not found"),
        ));
      }
    }

    let dead_letter_queue_threshold = query
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

    res.set(MediaType::Json);
    res.set(StatusCode::Created);
    return res.send(format_success(
      StatusCode::Created,
      String::from("Queue created successfully"),
      json!(null),
    ));
  }
}

pub fn compact_queue_handler<'mw>(
  req: &mut Request,
  mut res: Response<'mw>,
) -> MiddlewareResult<'mw> {
  if !queue_exists(req) {
    res.set(MediaType::Json);
    res.set(StatusCode::NotFound);
    return res.send(format_error(
      StatusCode::NotFound,
      String::from("Queue not found"),
    ));
  } else {
    let mut queue_map = QUEUES.lock().unwrap();

    let queue_name = String::from(req.param("queue_name").unwrap());
    let queue = queue_map.get_mut(&queue_name).unwrap();

    if !queue.is_persistent() {
      return res.send(format_error(
        StatusCode::Forbidden,
        String::from("Nothing to compact: queue is not persistent"),
      ));
    }

    queue.compact();

    res.set(MediaType::Json);
    res.set(StatusCode::Ok);
    return res.send(format_success(
      StatusCode::Ok,
      String::from("Queue compacted successfully"),
      json!(null),
    ));
  }
}

pub fn purge_queue_handler<'mw>(
  req: &mut Request,
  mut res: Response<'mw>,
) -> MiddlewareResult<'mw> {
  if !queue_exists(req) {
    res.set(MediaType::Json);
    res.set(StatusCode::NotFound);
    return res.send(format_error(
      StatusCode::NotFound,
      String::from("Queue not found"),
    ));
  } else {
    let mut queue_map = QUEUES.lock().unwrap();

    let queue_name = String::from(req.param("queue_name").unwrap());
    let queue = queue_map.get_mut(&queue_name).unwrap();
    queue.purge(false);

    res.set(MediaType::Json);
    res.set(StatusCode::Ok);
    return res.send(format_success(
      StatusCode::Ok,
      String::from("Queue purged successfully"),
      json!(null),
    ));
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

pub fn delete_queue_handler<'mw>(
  req: &mut Request,
  mut res: Response<'mw>,
) -> MiddlewareResult<'mw> {
  if !queue_exists(req) {
    res.set(MediaType::Json);
    res.set(StatusCode::NotFound);
    return res.send(format_error(
      StatusCode::NotFound,
      String::from("Queue not found"),
    ));
  } else {
    let mut queue_map = QUEUES.lock().unwrap();

    let queue_name = String::from(req.param("queue_name").unwrap());

    if is_dead_letter_queue(queue_map.values().collect(), &queue_name) {
      res.set(MediaType::Json);
      res.set(StatusCode::Forbidden);
      return res.send(format_error(
        StatusCode::Forbidden,
        String::from("Queue is a dead letter queue"),
      ));
    }

    let mut queue = queue_map.remove(&queue_name).unwrap();
    queue.purge(true);

    res.set(MediaType::Json);
    res.set(StatusCode::Ok);
    return res.send(format_success(
      StatusCode::Ok,
      String::from("Queue deleted successfully"),
      json!(null),
    ));
  }
}
