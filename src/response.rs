use nickel::status::StatusCode;
use serde_json::{json, Value};

pub fn format_success(status: StatusCode, message: String, result: Value) -> String {
  let res_body = json!({
    "status": status.to_u16(),
    "message": message,
    "result": result,
  });
  serde_json::to_string(&res_body).expect("JSON stringify failed")
}

pub fn format_error(status: StatusCode, message: String) -> String {
  let res_body = json!({
    "status": status.to_u16(),
    "error": true,
    "message": message,
  });
  serde_json::to_string(&res_body).expect("JSON stringify failed")
}
