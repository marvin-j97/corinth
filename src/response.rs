use serde_json::{json, Value};

pub fn format_success(status: u16, message: String, result: Value) -> String {
  let res_body = json!({
    "status": status,
    "message": message,
    "result": result,
  });
  serde_json::to_string(&res_body).expect("JSON stringify failed")
}

pub fn format_error(status: u16, message: String) -> String {
  let res_body = json!({
    "status": status,
    "error": true,
    "message": message,
  });
  serde_json::to_string(&res_body).expect("JSON stringify failed")
}
