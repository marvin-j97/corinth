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
const queueUrl = getQueueUrl(queueName);
const dequeueUrl = queueUrl + "/dequeue";
const axiosConfig = {
  ...NO_FAIL(),
};

ava.serial("Dequeue queue head -> no queue", async (t) => {
  const res = await Axios.post(dequeueUrl, null, axiosConfig);
  t.is(res.status, 404);
  t.deepEqual(res.data, {
    error: true,
    message: "Queue not found",
  });
});

ava.serial("Create queue", async (t) => {
  const res = await createQueue(queueName, {
    ...axiosConfig,
    params: {
      ack_time: 3,
    },
  });
  t.is(res.status, 201);
  t.is(res.data.message, "Queue created successfully");
});

ava.serial("Queue should be empty", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.is(res.status, 200);
  validateEmptyQueueResponse(t, queueName, res, 0, 3);
});

ava.serial("Dequeue queue head -> empty queue", async (t) => {
  const res = await Axios.post(dequeueUrl, null, axiosConfig);
  t.is(res.status, 200);
  t.deepEqual(res.data, {
    message: "Request processed successfully",
    result: {
      items: [],
    },
  });
});

const item0 = {
  description: "This is a test object!",
};

ava.serial("Enqueue item", async (t) => {
  const res = await Axios.post(
    queueUrl + "/enqueue",
    {
      messages: [
        {
          item: item0,
          deduplication_id: null,
        },
      ],
    },
    axiosConfig
  );
  t.is(res.status, 202);
  t.is(typeof res.data.result, "object");
  t.is(res.data.result.num_enqueued, 1);
  t.is(Array.isArray(res.data.result.items), true);
  t.is(Object.keys(res.data.result).length, 2);
});

ava.serial("1 item should be queued", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, 1);
  t.is(res.data.result.queue.num_deduped, 0);
  t.is(res.data.result.queue.num_unacked, 0);
  t.is(res.data.result.queue.num_dedup_hits, 0);
  t.is(res.data.result.queue.num_acknowledged, 0);
  t.is(res.data.result.queue.dedup_time, 300);
  t.is(res.data.result.queue.ack_time, 3);
  t.is(res.data.result.queue.persistent, false);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 11);
});

ava.serial("Dequeue queue head -> item0", async (t) => {
  const res = await Axios.post(dequeueUrl, null, axiosConfig);
  t.is(res.status, 200);
  t.is(Array.isArray(res.data.result.items), true);
  t.is(res.data.result.items.length, 1);
  t.is(typeof res.data.result.items[0], "object");
  t.is(typeof res.data.result.items[0].id, "string");
  t.is(typeof res.data.result.items[0].queued_at, "number");
  t.deepEqual(res.data.result.items[0].item, item0);
});

ava.serial("1 item should be unacked", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, 0);
  t.is(res.data.result.queue.num_deduped, 0);
  t.is(res.data.result.queue.num_unacked, 1);
  t.is(res.data.result.queue.num_dedup_hits, 0);
  t.is(res.data.result.queue.num_acknowledged, 0);
  t.is(res.data.result.queue.dedup_time, 300);
  t.is(res.data.result.queue.ack_time, 3);
  t.is(res.data.result.queue.persistent, false);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 11);
  await sleep(3000);
});

ava.serial("1 item should be queued again", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, 1);
  t.is(res.data.result.queue.num_deduped, 0);
  t.is(res.data.result.queue.num_unacked, 0);
  t.is(res.data.result.queue.num_dedup_hits, 0);
  t.is(res.data.result.queue.num_acknowledged, 0);
  t.is(res.data.result.queue.dedup_time, 300);
  t.is(res.data.result.queue.ack_time, 3);
  t.is(res.data.result.queue.persistent, false);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 11);
});
