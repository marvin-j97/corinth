// use chrono::{DateTime, Local};
use std::time::{Instant, SystemTime, UNIX_EPOCH};

// pub fn iso_date() -> String {
//   let now: DateTime<Local> = Local::now();
//   now.to_rfc2822()
// }

pub fn timestamp() -> u64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap()
    .as_secs()
}

pub fn elapsed_secs(start_time: Instant) -> u64 {
  start_time.elapsed().as_secs()
}
