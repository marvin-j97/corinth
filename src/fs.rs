use crate::env::data_folder;
use std::fs::create_dir_all;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::Path;

pub fn file_exists(path: &String) -> bool {
  Path::new(&path).exists()
}

pub fn append_to_file(path: &String, text: String) {
  let mut file = OpenOptions::new()
    .append(true)
    .create(true)
    .open(path)
    .expect("Cannot open file");
  file.write_all(text.as_bytes()).expect("Append failed");
}

pub fn create_data_folder() -> String {
  let folder = data_folder();
  create_dir_all(&folder).ok();
  folder
}
