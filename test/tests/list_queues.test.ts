import ava from "ava";
import Axios from "axios";
import { getUrl, spawnCorinth, NO_FAIL } from "../util";
import { createQueue } from "../common";

spawnCorinth();

ava.serial("List queues", async (t) => {
  const names = ["asd", "peter", "hello", "paradise_circus", "test", "zzz"];
  for (const name of names) {
    await createQueue(name);
  }

  const res = await Axios.get(getUrl("/queues"), NO_FAIL);
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queues, "object");

  t.is(Array.isArray(res.data.result.queues.items), true);
  t.is(typeof res.data.result.queues.length, "number");
  t.is(res.data.result.queues.items.length, res.data.result.queues.length);

  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queues).length, 2);

  t.deepEqual(res.data.result.queues.items, names.slice().sort());
});
