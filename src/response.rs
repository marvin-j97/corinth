use nickel::status::StatusCode;
use nickel::Response;
use serde_json::Value;

#[derive(Serialize, Deserialize)]
struct SuccessResponse {
  result: Value,
}

#[derive(Serialize, Deserialize)]
struct ErrorResponse {
  error: bool,
  message: String,
}

pub fn success(
  res: &mut Response,
  status: StatusCode,
  result: Value,
) -> Result<Value, (nickel::status::StatusCode, serde_json::error::Error)> {
  res.set(status);
  let res_body = SuccessResponse { result };
  serde_json::to_value(res_body).map_err(|e| (StatusCode::InternalServerError, e))
}

pub fn error(
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
