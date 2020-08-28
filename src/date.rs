use chrono::{DateTime, Local};
use std::time::{SystemTime, UNIX_EPOCH};

pub fn iso_date() -> String {
  let now: DateTime<Local> = Local::now();
  now.to_rfc2822()
}

pub fn timestamp() -> u64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap()
    .as_secs()
}

pub fn min_to_secs(min: u64) -> u64 {
  min * 60
}
