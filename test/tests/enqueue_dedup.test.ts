import ava from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL } from "../util";
import {
  queueUrl as getQueueUrl,
  createQueue,
  validateEmptyQueueResponse,
} from "../common";

spawnCorinth();

const queueName = "new_queue";
const deduplication_id = "i5joaibj5oiwj5";
const axiosConfig = {
  ...NO_FAIL(),
  params: { deduplication_id },
};
const queueUrl = getQueueUrl(queueName);
const testItem = {
  description: "This is a test object!",
};
const reqBody = {
  item: testItem,
};

ava.serial("Enqueue item to non-existing queue", async (t) => {
  const res = await Axios.post(queueUrl + "/enqueue", reqBody, axiosConfig);
  t.is(res.status, 404);
  t.is(res.data, "Not Found");
});

ava.serial("Create queue", async (t) => {
  const res = await createQueue(queueName, NO_FAIL());
  t.is(res.status, 201);
});

ava.serial("Queue should be empty", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL());
  t.is(res.status, 200);
  validateEmptyQueueResponse(t, queueName, res);
});

ava.serial("Enqueue item", async (t) => {
  const res = await Axios.post(queueUrl + "/enqueue", reqBody, axiosConfig);
  t.is(res.status, 201);
  t.is(typeof res.data.result, "object");
  t.is(res.data.result.message, "Message has been enqueued");
  t.is(typeof res.data.result.item, "object");
  t.is(typeof res.data.result.item.id, "string");
  t.is(typeof res.data.result.item.queued_at, "number");
  t.deepEqual(res.data.result.item.item, testItem);
  t.is(Object.keys(res.data.result).length, 2);
  t.is(Object.keys(res.data.result.item).length, 3);
});

ava.serial("1 item should be queued", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL());
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, 1);
  t.is(res.data.result.queue.num_deduped, 1);
  t.is(res.data.result.queue.num_dedup_hits, 0);
  t.is(res.data.result.queue.num_done, 0);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 6);
});

const NUM_ITEMS = 10;

ava.serial(`Enqueue ${NUM_ITEMS} items`, async (t) => {
  for (let i = 0; i < NUM_ITEMS; i++) {
    const res = await Axios.post(queueUrl + "/enqueue", reqBody, axiosConfig);
    t.is(res.status, 202);
    t.is(typeof res.data.result, "object");
    t.is(res.data.result.message, "Message has been discarded");
    t.is(Object.keys(res.data.result).length, 1);
  }
});

ava.serial("1 item should be queued, still", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL());
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, 1);
  t.is(res.data.result.queue.num_deduped, 1);
  t.is(res.data.result.queue.num_dedup_hits, NUM_ITEMS);
  t.is(res.data.result.queue.num_done, 0);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 6);
});

// TODO: set DEDUP_TIME to ~5 secs, wait until dedup runs out and enqueue again
// enqueue(id)
// wait()
// enqueue(id)
// -> queue size should be +2
