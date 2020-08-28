import ava from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL } from "../util";
import { queueUrl as getQueueUrl, createQueue } from "../common";

spawnCorinth();

const queueName = "new_queue";
const queueUrl = getQueueUrl(queueName);

ava.serial("Queue shouldn't exist", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL);
  t.is(res.status, 404);
});

ava.serial("Create queue", async (t) => {
  const res = await createQueue(queueName, NO_FAIL);
  t.is(res.status, 201);
});

ava.serial("Queue should be empty", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL);
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(res.data.result.name, queueName);
  t.is(typeof res.data.result.created_at, "number");
  t.is(res.data.result.size, 0);
  t.is(res.data.result.num_deduped, 0);
  t.is(res.data.result.num_done, 0);
  t.is(Object.keys(res.data.result).length, 5);
});
