import ava, { before, after } from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL, persistenceTeardown } from "../../util";
import { queueUrl as getQueueUrl, createQueue } from "../../common";
import yxc, { createExecutableSchema } from "@dotvirus/yxc";
import { existsSync } from "fs";
import axiosRetry from "axios-retry";
import { resolve } from "path";

axiosRetry(Axios, { retries: 3 });

before(persistenceTeardown);
after(persistenceTeardown);

spawnCorinth();

const queueName = "edit_queue_persistent";
const queueUrl = getQueueUrl(queueName);
const axiosConfig = {
  ...NO_FAIL(),
  params: {
    persistent: true,
  },
};

ava.serial("Create persistent queue", async (t) => {
  const res = await createQueue(queueName, axiosConfig);
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(201),
          data: yxc.object({
            message: yxc.string().equals("Queue created successfully"),
            status: yxc.number().equals(201),
            result: yxc.null(),
          }),
        })
        .arbitrary()
    )(res).ok
  );
  t.assert(existsSync(".corinth/queues/edit_queue_persistent/meta.json"));
  t.is(
    require(resolve("./.corinth/queues/edit_queue_persistent/meta.json"))
      .max_length,
    0
  );
  delete require.cache[
    require.resolve(
      resolve("./.corinth/queues/edit_queue_persistent/meta.json")
    )
  ];
  t.assert(!existsSync(".corinth/queues/edit_queue_persistent/items.jsonl"));
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
                max_length: yxc.number().eq(0),
                dead_letter: yxc.null(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("Edit queue", async (t) => {
  const res = await Axios.patch(
    queueUrl,
    {
      max_length: 5,
    },
    NO_FAIL()
  );
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(200),
          data: yxc.object({
            message: yxc.string().equals("Queue edited successfully"),
            status: yxc.number().equals(200),
            result: yxc.null(),
          }),
        })
        .arbitrary()
    )(res).ok
  );
  t.assert(existsSync(".corinth/queues/edit_queue_persistent/meta.json"));
  t.is(
    require(resolve("./.corinth/queues/edit_queue_persistent/meta.json"))
      .max_length,
    5
  );
  delete require.cache[
    require.resolve(
      resolve("./.corinth/queues/edit_queue_persistent/meta.json")
    )
  ];
  t.assert(!existsSync(".corinth/queues/edit_queue_persistent/items.jsonl"));
});

ava.serial("Queue should be updated", async (t) => {
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
                max_length: yxc.number().eq(5),
                dead_letter: yxc.null(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});
