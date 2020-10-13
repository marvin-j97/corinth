use std::convert::TryInto;
use std::env;

pub fn try_env_to_uint(name: String) -> Option<u64> {
  let str_value = env::var(name).ok();
  if str_value.is_some() {
    return Some(
      str_value
        .unwrap()
        .parse::<u64>()
        .expect("Invalid env variable!"),
    );
  }
  None
}

pub fn get_port() -> u16 {
  let num = try_env_to_uint(String::from("CORINTH_PORT"));
  if num.is_some() {
    num.unwrap().try_into().expect("Invalid port value")
  } else {
    44444
  }
}

pub fn get_compaction_interval() -> u32 {
  let num = try_env_to_uint(String::from("CORINTH_COMPACT_INTERVAL"));
  if num.is_some() {
    num.unwrap().try_into().expect("Invalid port value")
  } else {
    86400
  }
}

pub fn data_folder() -> String {
  env::var("CORINTH_BASE_FOLDER").unwrap_or(String::from(".corinth"))
}
