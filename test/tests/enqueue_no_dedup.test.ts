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

// TODO: enqueue item before queue exists

ava.serial("Create queue", async (t) => {
  const res = await createQueue(queueName, NO_FAIL());
  t.is(res.status, 201);
});

ava.serial("Queue should be empty", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL());
  t.is(res.status, 200);
  validateEmptyQueueResponse(t, queueName, res);
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
    NO_FAIL()
  );
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
  t.is(res.data.result.queue.num_deduped, 0);
  t.is(res.data.result.queue.num_dedup_hits, 0);
  t.is(res.data.result.queue.num_done, 0);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 6);
});

const NUM_ITEMS = 10;

ava.serial(`Enqueue ${NUM_ITEMS} items`, async (t) => {
  for (let i = 0; i < NUM_ITEMS; i++) {
    const res = await Axios.post(
      queueUrl + "/enqueue",
      {
        item: testItem,
      },
      NO_FAIL()
    );
    t.is(res.status, 201);
    t.is(typeof res.data.result, "object");
    t.is(res.data.result.message, "Message has been enqueued");
    t.is(typeof res.data.result.item, "object");
    t.is(typeof res.data.result.item.id, "string");
    t.is(typeof res.data.result.item.queued_at, "number");
    t.deepEqual(res.data.result.item.item, testItem);
    t.is(Object.keys(res.data.result).length, 2);
    t.is(Object.keys(res.data.result.item).length, 3);
  }
});

ava.serial(`${NUM_ITEMS + 1} items should be queued`, async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL());
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(res.data.result.queue.size, NUM_ITEMS + 1);
  t.is(res.data.result.queue.num_deduped, 0);
  t.is(res.data.result.queue.num_dedup_hits, 0);
  t.is(res.data.result.queue.num_done, 0);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 6);
});
