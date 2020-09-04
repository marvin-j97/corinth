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
const queueUrl = getQueueUrl(queueName);
const dequeueUrl = queueUrl + "/dequeue";
const axiosConfig = {
  ...NO_FAIL(),
};

ava.serial("Create queue", async (t) => {
  const res = await createQueue(queueName, axiosConfig);
  t.is(res.status, 201);
  t.is(res.data.message, "Queue created successfully");
});

ava.serial("Queue should be empty", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.is(res.status, 200);
  validateEmptyQueueResponse(t, queueName, res);
});

ava.serial("Enqueue item", async (t) => {
  const res = await Axios.post(
    queueUrl + "/enqueue",
    {
      messages: [
        {
          item: {},
          deduplication_id: null,
        },
        {
          item: {},
          deduplication_id: null,
        },
        {
          item: {},
          deduplication_id: null,
        },
        {
          item: {},
          deduplication_id: null,
        },
        {
          item: {},
          deduplication_id: null,
        },
      ],
    },
    axiosConfig
  );
  t.is(res.status, 202);
  t.is(typeof res.data.result, "object");
  t.is(res.data.result.num_enqueued, 5);
  t.is(Array.isArray(res.data.result.items), true);
  t.is(Object.keys(res.data.result).length, 2);
});

ava.serial("5 items should be queued", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, 5);
  t.is(res.data.result.queue.num_deduped, 0);
  t.is(res.data.result.queue.num_unacked, 0);
  t.is(res.data.result.queue.num_dedup_hits, 0);
  t.is(res.data.result.queue.num_acknowledged, 0);
  t.is(res.data.result.queue.dedup_time, 300);
  t.is(res.data.result.queue.ack_time, 300);
  t.is(res.data.result.queue.persistent, false);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 11);
});

ava.serial("Enqueue item with dedup", async (t) => {
  const res = await Axios.post(
    queueUrl + "/enqueue",
    {
      messages: [
        {
          item: {},
          deduplication_id: "1",
        },
        {
          item: {},
          deduplication_id: "2",
        },
        {
          item: {},
          deduplication_id: "3",
        },
        {
          item: {},
          deduplication_id: "1",
        },
        {
          item: {},
          deduplication_id: "1",
        },
      ],
    },
    axiosConfig
  );
  t.is(res.status, 202);
  t.is(typeof res.data.result, "object");
  t.is(res.data.result.num_enqueued, 3);
  t.is(Array.isArray(res.data.result.items), true);
  t.is(Object.keys(res.data.result).length, 2);
});

ava.serial("8 items should be queued", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, 8);
  t.is(res.data.result.queue.num_deduped, 3);
  t.is(res.data.result.queue.num_unacked, 0);
  t.is(res.data.result.queue.num_dedup_hits, 2);
  t.is(res.data.result.queue.num_acknowledged, 0);
  t.is(res.data.result.queue.dedup_time, 300);
  t.is(res.data.result.queue.ack_time, 300);
  t.is(res.data.result.queue.persistent, false);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 11);
});

ava.serial("Enqueue more item with dedup", async (t) => {
  const res = await Axios.post(
    queueUrl + "/enqueue",
    {
      messages: [
        {
          item: {},
          deduplication_id: "1",
        },
        {
          item: {},
          deduplication_id: "2",
        },
      ],
    },
    axiosConfig
  );
  t.is(res.status, 202);
  t.is(typeof res.data.result, "object");
  t.is(res.data.result.num_enqueued, 0);
  t.is(Array.isArray(res.data.result.items), true);
  t.is(Object.keys(res.data.result).length, 2);
});

ava.serial("8 items should still be queued", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, 8);
  t.is(res.data.result.queue.num_deduped, 3);
  t.is(res.data.result.queue.num_unacked, 0);
  t.is(res.data.result.queue.num_dedup_hits, 4);
  t.is(res.data.result.queue.num_acknowledged, 0);
  t.is(res.data.result.queue.dedup_time, 300);
  t.is(res.data.result.queue.ack_time, 300);
  t.is(res.data.result.queue.persistent, false);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 11);
});

ava.serial("Dequeue queue head", async (t) => {
  const res = await Axios.post(dequeueUrl, null, {
    ...NO_FAIL(),
    params: {
      ack: "true",
      amount: 5,
    },
  });
  t.is(res.status, 200);
  t.is(res.data.message, "Request processed successfully");
  t.is(res.data.result.items.length, 5);
  t.is(Object.keys(res.data.result).length, 1);
});

ava.serial("3 items should still be queued", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, 3);
  t.is(res.data.result.queue.num_deduped, 3);
  t.is(res.data.result.queue.num_unacked, 0);
  t.is(res.data.result.queue.num_dedup_hits, 4);
  t.is(res.data.result.queue.num_acknowledged, 5);
  t.is(res.data.result.queue.dedup_time, 300);
  t.is(res.data.result.queue.ack_time, 300);
  t.is(res.data.result.queue.persistent, false);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 11);
});

ava.serial("Dequeue queue head, get remaining items", async (t) => {
  const res = await Axios.post(dequeueUrl, null, {
    ...NO_FAIL(),
    params: {
      ack: "true",
      amount: 5,
    },
  });
  t.is(res.status, 200);
  t.is(res.data.message, "Request processed successfully");
  t.is(res.data.result.items.length, 3);
  t.is(Object.keys(res.data.result).length, 1);
});

ava.serial("0 items should still be queued", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, 0);
  t.is(res.data.result.queue.num_deduped, 3);
  t.is(res.data.result.queue.num_unacked, 0);
  t.is(res.data.result.queue.num_dedup_hits, 4);
  t.is(res.data.result.queue.num_acknowledged, 8);
  t.is(res.data.result.queue.dedup_time, 300);
  t.is(res.data.result.queue.ack_time, 300);
  t.is(res.data.result.queue.persistent, false);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 11);
});
