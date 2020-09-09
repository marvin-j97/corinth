import ava, { before, after } from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL, sleep, persistenceTeardown } from "../../util";
import { queueUrl as getQueueUrl, createQueue, Message } from "../../common";
import yxc, { createExecutableSchema } from "@dotvirus/yxc";
import { existsSync } from "fs";

before(persistenceTeardown);
after(persistenceTeardown);

let corinth = spawnCorinth();

const queueName = "storeload";
const queueUrl = getQueueUrl(queueName);
const axiosConfig = {
  ...NO_FAIL(),
  params: {
    persistent: true,
  },
};

ava.serial("Create queue", async (t) => {
  const res = await createQueue(queueName, axiosConfig);
  t.deepEqual(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().enum([201]),
          data: yxc.object({
            message: yxc.string().enum(["Queue created successfully"]),
            status: yxc.number().enum([201]),
            result: yxc
              .any()
              .nullable()
              .use((v) => v === null),
          }),
        })
        .arbitrary()
    )(res),
    []
  );
  t.is(existsSync(".corinth/storeload/meta.json"), true);
  t.is(existsSync(".corinth/storeload/items.jsonl"), false);
});

ava.serial("Queue should be empty", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.deepEqual(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().enum([200]),
          data: yxc.object({
            message: yxc.string().enum(["Queue info retrieved successfully"]),
            status: yxc.number().enum([200]),
            result: yxc.object({
              queue: yxc.object({
                name: yxc.string().enum([queueName]),
                created_at: yxc.number().integer(),
                size: yxc.number().enum([0]),
                num_deduplicating: yxc.number().enum([0]),
                num_unacknowledged: yxc.number().enum([0]),
                num_deduplicated: yxc.number().enum([0]),
                num_acknowledged: yxc.number().enum([0]),
                num_requeued: yxc.number().enum([0]),
                deduplication_time: yxc.number().enum([300]),
                requeue_time: yxc.number().enum([300]),
                persistent: yxc.boolean().true(),
                memory_size: yxc.number(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res),
    []
  );
});

const NUM_ITEMS = 10;

const testItem = {
  description: "This is a test object!",
};
const reqBody = (index: number) => ({
  messages: [
    {
      item: {
        ...testItem,
        index,
      },
      deduplication_id: null,
    },
  ],
});

ava.serial(`Enqueue ${NUM_ITEMS} items`, async (t) => {
  for (let i = 0; i < NUM_ITEMS; i++) {
    const res = await Axios.post(
      queueUrl + "/enqueue",
      reqBody(i),
      axiosConfig
    );
    t.deepEqual(
      createExecutableSchema(
        yxc
          .object({
            status: yxc.number().enum([202]),
            data: yxc.object({
              message: yxc.string().enum(["Request processed successfully"]),
              status: yxc.number().enum([202]),
              result: yxc.object({
                items: yxc.array(Message()).len(1),
                num_enqueued: yxc.number().enum([1]),
                num_deduplicated: yxc.number().enum([0]),
              }),
            }),
          })
          .arbitrary()
      )(res),
      []
    );
  }
  t.is(existsSync(".corinth/storeload/items.jsonl"), true);
});

ava.serial(`${NUM_ITEMS} items should be queued`, async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.deepEqual(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().enum([200]),
          data: yxc.object({
            message: yxc.string().enum(["Queue info retrieved successfully"]),
            status: yxc.number().enum([200]),
            result: yxc.object({
              queue: yxc.object({
                name: yxc.string().enum([queueName]),
                created_at: yxc.number().integer(),
                size: yxc.number().enum([NUM_ITEMS]),
                num_deduplicating: yxc.number().enum([0]),
                num_unacknowledged: yxc.number().enum([0]),
                num_deduplicated: yxc.number().enum([0]),
                num_acknowledged: yxc.number().enum([0]),
                num_requeued: yxc.number().enum([0]),
                deduplication_time: yxc.number().enum([300]),
                requeue_time: yxc.number().enum([300]),
                persistent: yxc.boolean().true(),
                memory_size: yxc.number(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res),
    []
  );
});

ava.serial("Stop exe", async (t) => {
  corinth.kill();
  corinth = spawnCorinth();
  await sleep(1000);
  t.pass();
});

ava.serial("Queue should persist restart", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
  t.deepEqual(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().enum([200]),
          data: yxc.object({
            message: yxc.string().enum(["Queue info retrieved successfully"]),
            status: yxc.number().enum([200]),
            result: yxc.object({
              queue: yxc.object({
                name: yxc.string().enum([queueName]),
                created_at: yxc.number().integer(),
                size: yxc.number().enum([NUM_ITEMS]),
                num_deduplicating: yxc.number().enum([0]),
                num_unacknowledged: yxc.number().enum([0]),
                num_deduplicated: yxc.number().enum([0]),
                num_acknowledged: yxc.number().enum([0]),
                num_requeued: yxc.number().enum([0]),
                deduplication_time: yxc.number().enum([300]),
                requeue_time: yxc.number().enum([300]),
                persistent: yxc.boolean().true(),
                memory_size: yxc.number(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res),
    []
  );
});
