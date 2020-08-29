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

ava.serial("Queue shouldn't exist", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL());
  t.is(res.status, 404);
  t.deepEqual(res.data, {
    error: true,
    message: "Queue not found",
  });
});

ava.serial("Create queue", async (t) => {
  const res = await createQueue(queueName, NO_FAIL());
  t.is(res.status, 201);
  t.is(res.data.result.message, "Queue created");
});

ava.serial("Queue should be empty", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL());
  t.is(res.status, 200);
  validateEmptyQueueResponse(t, queueName, res);
});
