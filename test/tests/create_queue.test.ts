import ava from "ava";
import Axios from "axios";
import { getUrl, spawnCorinth, NO_FAIL } from "../util";

spawnCorinth();

const queueName = "new_queue";
const queueUrl = getUrl(`/queue/${queueName}`);

ava.serial("GET /queue/new_queue -> 404", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL);
  t.is(res.status, 404);
});

ava.serial("PUT /queue/new_queue", async (t) => {
  const res = await Axios.put(queueUrl, NO_FAIL);
  t.is(res.status, 201);
});

ava.serial("GET /queue/new_queue -> 200", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL);
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(res.data.result.name, queueName);
  t.is(res.data.result.size, 0);
  t.is(res.data.result.num_deduped, 0);
});
