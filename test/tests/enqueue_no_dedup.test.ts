import ava from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL } from "../util";
import { queueUrl as getQueueUrl, createQueue } from "../common";
import test from "ava";

spawnCorinth();

const queueName = "new_queue";
const queueUrl = getQueueUrl(queueName);

ava.serial("Create queue", async (t) => {
  const res = await createQueue(queueName, NO_FAIL);
  t.is(res.status, 201);
});

ava.serial("Queue should be empty", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL);
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, 0);
  t.is(res.data.result.queue.num_deduped, 0);
  t.is(res.data.result.queue.num_done, 0);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 5);
});

const testItem = {
  description: "This is a test object!",
};

ava.serial("Enqueue item", async (t) => {
  const res = await Axios.post(
    queueUrl + "/enqueue",
    {
      item: testItem,
    },
    NO_FAIL
  );
  t.is(res.status, 201);
  t.is(typeof res.data.result, "object");
  t.is(res.data.result.message, "Message has been enqueued");
  t.is(typeof res.data.result.item, "object");
  t.is(typeof res.data.result.item.id, "string");
  t.is(typeof res.data.result.item.queued_at, "number");
  t.deepEqual(res.data.result.item.item, testItem);
});

ava.serial("1 item should be queued", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL);
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, 1);
  t.is(res.data.result.queue.num_deduped, 0);
  t.is(res.data.result.queue.num_done, 0);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 5);
});

ava.serial("Enqueue 50 items", async (t) => {
  for (let i = 0; i < 50; i++) {
    const res = await Axios.post(
      queueUrl + "/enqueue",
      {
        item: testItem,
      },
      NO_FAIL
    );
    t.is(res.status, 201);
    t.is(typeof res.data.result, "object");
    t.is(res.data.result.message, "Message has been enqueued");
    t.is(typeof res.data.result.item, "object");
    t.is(typeof res.data.result.item.id, "string");
    t.is(typeof res.data.result.item.queued_at, "number");
    t.deepEqual(res.data.result.item.item, testItem);
  }
});

ava.serial("51 items should be queued", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL);
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, 51);
  t.is(res.data.result.queue.num_deduped, 0);
  t.is(res.data.result.queue.num_done, 0);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 5);
});
