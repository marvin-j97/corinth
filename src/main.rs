#[macro_use]
extern crate nickel;
extern crate serde;
extern crate serde_json;
#[macro_use]
extern crate serde_derive;

use nickel::status::StatusCode;
use nickel::{HttpRouter, Nickel};

#[derive(Serialize, Deserialize)]
struct Person {
  first_name: String,
  last_name: String,
}

fn main() {
  let mut server = Nickel::new();

  server.get(
    "/:first/:last",
    middleware! { |req|
      // These unwraps are safe because they are required parts of the route
      let first_name = req.param("first").unwrap();
      let last_name = req.param("last").unwrap();

      let person = Person {
        first_name: first_name.to_string(),
        last_name: last_name.to_string(),
      };
      serde_json::to_value(person).map_err(|e| (StatusCode::InternalServerError, e))
    },
  );

  server.listen("127.0.0.1:6767").expect("Fatal error");
}
