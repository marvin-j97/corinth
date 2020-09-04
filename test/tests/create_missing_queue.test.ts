import ava from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL } from "../util";
import { queueUrl as getQueueUrl } from "../common";

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
      deduplication_id: null,
    },
  ],
};

ava.serial("Create missing queue on enqueue", async (t) => {
  const res = await Axios.post(queueUrl + "/enqueue", reqBody, {
    ...axiosConfig,
    params: {
      create_queue: "true",
    },
  });
  t.is(res.status, 202);
  t.is(typeof res.data.result, "object");
  t.is(res.data.result.num_enqueued, 1);
  t.is(Array.isArray(res.data.result.items), true);
  t.is(Object.keys(res.data.result).length, 2);
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
  t.is(res.data.result.queue.num_unacked, 0);
  t.is(res.data.result.queue.num_dedup_hits, 0);
  t.is(res.data.result.queue.num_acknowledged, 0);
  t.is(res.data.result.queue.dedup_time, 300);
  t.is(res.data.result.queue.ack_time, 300);
  t.is(res.data.result.queue.persistent, false);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 11);
});
