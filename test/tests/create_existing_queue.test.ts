import ava, { before, after } from "ava";
import { spawnCorinth, NO_FAIL, persistenceTeardown } from "../util";
import { createQueue } from "../common";
import yxc, { createExecutableSchema } from "@dotvirus/yxc";

before(persistenceTeardown);
after(persistenceTeardown);

spawnCorinth();

const queueName = "new_queue";

ava.serial("Create volatile queue", async (t) => {
  await createQueue(queueName, NO_FAIL());
  t.pass();
});

ava.serial("Create conflicting queue", async (t) => {
  const res = await createQueue(queueName, NO_FAIL());
  t.deepEqual(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().enum([409]),
          data: yxc.object({
            error: yxc.boolean().true(),
            message: yxc.string().enum(["Queue already exists"]),
            status: yxc.number().enum([409]),
          }),
        })
        .arbitrary()
    )(res),
    []
  );
});
