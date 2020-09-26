import ava, { before, after } from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL, persistenceTeardown } from "../util";
import { queueUrl as getQueueUrl, createQueue } from "../common";
import yxc, { createExecutableSchema } from "@dotvirus/yxc";
import { existsSync } from "fs";
import axiosRetry from "axios-retry";

axiosRetry(Axios, { retries: 3 });

before(persistenceTeardown);
after(persistenceTeardown);

spawnCorinth();

const queueName = "persistent_new_queue_test";
const queueUrl = getQueueUrl(queueName);

ava.serial("Create persistent queue", async (t) => {
  t.is(existsSync(`.corinth/queues/${queueName}/meta.json`), false);
  t.is(existsSync(`.corinth/queues/${queueName}/items.jsonl`), false);
  const res = await createQueue(queueName, {
    ...NO_FAIL(),
    params: {
      persistent: true,
    },
  });
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(201),
          data: yxc.object({
            message: yxc.string().equals("Queue created successfully"),
            status: yxc.number().equals(201),
            result: yxc
              .any()
              .nullable()
              .use((v) => v === null),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("Queue should be empty", async (t) => {
  const res = await Axios.get(queueUrl, NO_FAIL());
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(200),
          data: yxc.object({
            message: yxc.string().equals("Queue info retrieved successfully"),
            status: yxc.number().equals(200),
            result: yxc.object({
              queue: yxc.object({
                name: yxc.string().equals(queueName),
                created_at: yxc.number().integer(),
                size: yxc.number().equals(0),
                num_deduplicating: yxc.number().equals(0),
                num_unacknowledged: yxc.number().equals(0),
                num_deduplicated: yxc.number().equals(0),
                num_acknowledged: yxc.number().equals(0),
                num_requeued: yxc.number().equals(0),
                deduplication_time: yxc.number().equals(300),
                requeue_time: yxc.number().equals(300),
                persistent: yxc.boolean().true(),
                memory_size: yxc.number(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
  t.is(existsSync(`.corinth/queues/${queueName}/meta.json`), true);
  t.is(existsSync(`.corinth/queues/${queueName}/items.jsonl`), false);
});
