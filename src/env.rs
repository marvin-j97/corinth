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
  std::env::var("CORINTH_PORT")
    .unwrap_or(String::from("6767"))
    .parse::<u16>()
    .expect("Invalid port value")
}

pub fn data_folder() -> String {
  env::var("CORINTH_BASE_FOLDER").unwrap_or(String::from(".corinth"))
}
