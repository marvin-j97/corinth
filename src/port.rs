use std::convert::TryInto;

pub fn get_port() -> u16 {
  let port = std::env::var("CORINTH_PORT")
    .unwrap_or(String::from("6767"))
    .parse::<u32>()
    .expect("Invalid port value");
  port.try_into().expect("Invalid port value")
}
