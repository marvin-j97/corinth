use std::fs::OpenOptions;
use std::io::Write;

fn append_to_file(path: String, text: String) {
  let mut file = OpenOptions::new()
    .append(true)
    .open(path)
    .expect("Cannot open file");
  file.write_all(text.as_bytes()).expect("Append failed");
}
