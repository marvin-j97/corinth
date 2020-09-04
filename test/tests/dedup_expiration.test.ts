import ava from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL, sleep } from "../util";
import {
  queueUrl as getQueueUrl,
  createQueue,
  validateEmptyQueueResponse,
} from "../common";

spawnCorinth();

const queueName = "new_queue";
const axiosConfig = NO_FAIL();
const queueUrl = getQueueUrl(queueName);
const testItem = {
  description: "This is a test object!",
};
const reqBody = {
  messages: [
    {
      item: testItem,
      deduplication_id: "i5joaibj5oiwj5",
    },
  ],
};

ava.serial("Enqueue item to non-existing queue", async (t) => {
  const res = await Axios.post(queueUrl + "/enqueue", reqBody, axiosConfig);
  t.is(res.status, 404);
  t.is(res.data, "Not Found");
});

ava.serial("Create queue", async (t) => {
  const res = await createQueue(queueName, {
    ...NO_FAIL(),
    params: {
      dedup_time: 3,
    },
  });
  t.is(res.status, 201);
  t.is(res.data.message, "Queue created successfully");
});

ava.serial("Queue should be empty", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL());
  t.is(res.status, 200);
  validateEmptyQueueResponse(t, queueName, res, 0, 300, 3);
});

ava.serial("Enqueue first item", async (t) => {
  const res = await Axios.post(queueUrl + "/enqueue", reqBody, axiosConfig);
  t.is(res.status, 202);
  t.is(typeof res.data.result, "object");
  t.is(res.data.result.num_enqueued, 1);
  t.is(res.data.result.num_deduplicated, 0);
  t.is(Array.isArray(res.data.result.items), true);
  t.is(Object.keys(res.data.result).length, 3);
});

ava.serial("Enqueue more items", async (t) => {
  for (let i = 0; i < 5; i++) {
    const res = await Axios.post(queueUrl + "/enqueue", reqBody, axiosConfig);
    t.is(res.status, 202);
    t.is(res.data.result.num_enqueued, 0);
    t.is(res.data.result.num_deduplicated, 1);
    t.is(Array.isArray(res.data.result.items), true);
    t.is(Object.keys(res.data.result).length, 3);
  }
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
  t.is(res.data.result.queue.num_unacked, 0);
  t.is(res.data.result.queue.num_dedup_hits, 5);
  t.is(res.data.result.queue.num_acknowledged, 0);
  t.is(res.data.result.queue.dedup_time, 3);
  t.is(res.data.result.queue.ack_time, 300);
  t.is(res.data.result.queue.persistent, false);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 11);
  await sleep(3000);
});

ava.serial("1 item should be queued, but no dedup anymore", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL());
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, 1);
  t.is(res.data.result.queue.num_deduped, 0); // <- expiration
  t.is(res.data.result.queue.num_unacked, 0);
  t.is(res.data.result.queue.num_dedup_hits, 5);
  t.is(res.data.result.queue.num_acknowledged, 0);
  t.is(res.data.result.queue.dedup_time, 3);
  t.is(res.data.result.queue.ack_time, 300);
  t.is(res.data.result.queue.persistent, false);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 11);
});

ava.serial("Enqueue item after dedup expired", async (t) => {
  const res = await Axios.post(queueUrl + "/enqueue", reqBody, axiosConfig);
  t.is(res.status, 202);
  t.is(typeof res.data.result, "object");
  t.is(res.data.result.num_enqueued, 1);
  t.is(res.data.result.num_deduplicated, 0);
  t.is(Array.isArray(res.data.result.items), true);
  t.is(Object.keys(res.data.result).length, 3);
});

ava.serial("2 items should be queued", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL());
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, 2);
  t.is(res.data.result.queue.num_deduped, 1);
  t.is(res.data.result.queue.num_unacked, 0);
  t.is(res.data.result.queue.num_dedup_hits, 5);
  t.is(res.data.result.queue.num_acknowledged, 0);
  t.is(res.data.result.queue.dedup_time, 3);
  t.is(res.data.result.queue.ack_time, 300);
  t.is(res.data.result.queue.persistent, false);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 11);
});
