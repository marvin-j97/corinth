import ava, { before, after } from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL, persistenceTeardown } from "../util";
import { queueUrl as getQueueUrl } from "../common";
import yxc, { createExecutableSchema } from "@dotvirus/yxc";

before(persistenceTeardown);
after(persistenceTeardown);

spawnCorinth();

const queueName = "new_queue";
const queueUrl = getQueueUrl(queueName);

ava.serial("Queue shouldn't exist", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL());
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().enum([404]),
          data: yxc.object({
            status: yxc.number().enum([404]),
            error: yxc.boolean().true(),
            message: yxc.string().enum(["Queue not found"]),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});
