use crate::queue::Queue;
use serde_json::json;
use std::time::SystemTime;

fn bytes_to_mb(bytes: u64) -> u64 {
  bytes / 1000 / 1000
}

fn print_all_durations(time: SystemTime) {
  let elapsed = time.elapsed().unwrap();
  eprintln!("Done in {} seconds", elapsed.as_secs_f32());
  eprintln!("Done in {} millis", elapsed.as_millis());
  eprintln!("Done in {} micros", elapsed.as_micros());
  eprintln!("Done in {} nanos", elapsed.as_nanos());
}

fn simple_benchmark(size: u32) -> u64 {
  eprintln!("Running benchmark");
  let mem_usage;
  let mut queue = crate::queue::Queue::new("test0".to_string(), 300, 300, false);
  {
    let now = SystemTime::now();
    eprintln!("\nEnqueuing {} items", size);
    for i in 0..size {
      queue.try_enqueue(json!({ "test": i }), None);
    }
    print_all_durations(now);
    assert_eq!(queue.size() as u32, size);
    mem_usage = queue.get_memory_size();
  }
  {
    let now = SystemTime::now();
    eprintln!("\nPeeking & dequeuing {} items", size);
    for _i in 0..size {
      queue.peek();
      queue.dequeue(true);
    }
    print_all_durations(now);
    assert_eq!(queue.size(), 0);
  }
  {
    let now = SystemTime::now();
    eprintln!("\nEnqueuing & dequeuing {} items", size);
    for i in 0..size {
      queue.try_enqueue(json!({ "test": i }), None);
      queue.dequeue(true);
    }
    print_all_durations(now);
    assert_eq!(queue.size(), 0);
  }

  mem_usage as u64
}

fn memory_test(size: u32) -> u64 {
  let mut queue = Queue::new("test0".to_string(), 300, 300, false);
  {
    let now = SystemTime::now();
    eprintln!("\nEnqueuing {} items", size);
    for i in 0..size {
      queue.try_enqueue(json!({ "test": i }), None);
    }
    print_all_durations(now);
    assert_eq!(queue.size() as u32, size);
  }
  return queue.get_memory_size() as u64;
}

pub fn benchmark() {
  eprintln!("Running benchmark");
  let mut time_sum: u128 = 0;
  let sizes = vec![
    10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000,
  ];
  let num_runs = 10;
  let mut max_mem_size = 0;

  for i in 0..num_runs {
    eprintln!("Run {}", i);
    let now = SystemTime::now();
    for size in sizes.iter() {
      let mem_usage = simple_benchmark(*size);
      if mem_usage > max_mem_size {
        max_mem_size = mem_usage;
      }
    }
    time_sum += now.elapsed().unwrap().as_nanos();
  }

  let num_items = 5000000;
  let high_mem = memory_test(num_items);

  eprintln!("\n--- Benchmark result ({} runs) ---", num_runs);
  eprintln!(
    "Done in {} seconds",
    (time_sum as f64) / 1000.0 / 1000.0 / 1000.0
  );
  eprintln!("Done in {} millis", (time_sum as f64) / 1000.0 / 1000.0);
  eprintln!("Done in {} micros", (time_sum as f64) / 1000.0);
  eprintln!("Done in {} nanos", time_sum);
  eprintln!(
    "Max memory usage: {} bytes ({} MB)",
    max_mem_size,
    bytes_to_mb(max_mem_size)
  );
  eprintln!(
    "High memory test: {} items -> {} bytes ({} MB)",
    num_items,
    high_mem,
    bytes_to_mb(high_mem)
  );

  std::process::exit(0);
}
