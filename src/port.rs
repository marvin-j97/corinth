use std::convert::TryInto;

pub fn get_port() -> u16 {
  // Parse port from cli arguments
  // TODO: use env variable instead
  let mut port: u16 = 6767;

  let args: Vec<String> = std::env::args().collect();
  let num_args = args.len();
  let mut i = 0;

  while i < num_args - 1 {
    if args[i] == "--port" {
      let port_num: Option<u32> = args[i + 1].parse::<u32>().ok();
      if port_num.is_none() {
        println!("Invalid --port argument");
        std::process::exit(1);
      } else {
        port = port_num.unwrap().try_into().expect("Invalid port value");
      }
    }
    i += 1;
  }

  port
}
