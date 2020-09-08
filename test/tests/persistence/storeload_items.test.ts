import ava from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL } from "../../util";
import { queueUrl as getQueueUrl, createQueue, Message } from "../../common";
import yxc, { createExecutableSchema } from "@dotvirus/yxc";
import { existsSync, unlinkSync } from "fs";

try {
  unlinkSync(".corinth/storeload/meta.json");
  unlinkSync(".corinth/storeload/items.jsonl");
} catch (error) {}

if (
  existsSync(".corinth/storeload/meta.json") ||
  existsSync(".corinth/storeload/items.jsonl")
) {
  console.error("Test teardown failed");
  process.exit(1);
}

let corinth = spawnCorinth();

const queueName = "storeload";
const queueUrl = getQueueUrl(queueName);
const dequeueUrl = queueUrl + "/dequeue";
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
                num_deduped: yxc.number().enum([0]),
                num_unacked: yxc.number().enum([0]),
                num_dedup_hits: yxc.number().enum([0]),
                num_acknowledged: yxc.number().enum([0]),
                num_ack_misses: yxc.number().enum([0]),
                dedup_time: yxc.number().enum([300]),
                ack_time: yxc.number().enum([300]),
                persistent: yxc.boolean().true(),
                mem_size: yxc.number(),
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
                num_deduped: yxc.number().enum([0]),
                num_unacked: yxc.number().enum([0]),
                num_dedup_hits: yxc.number().enum([0]),
                num_acknowledged: yxc.number().enum([0]),
                num_ack_misses: yxc.number().enum([0]),
                dedup_time: yxc.number().enum([300]),
                ack_time: yxc.number().enum([300]),
                persistent: yxc.boolean().true(),
                mem_size: yxc.number(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res),
    []
  );
});

ava.serial("Stop exe", (t) => {
  corinth.kill();
  corinth = spawnCorinth();
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
                num_deduped: yxc.number().enum([0]),
                num_unacked: yxc.number().enum([0]),
                num_dedup_hits: yxc.number().enum([0]),
                num_acknowledged: yxc.number().enum([0]),
                num_ack_misses: yxc.number().enum([0]),
                dedup_time: yxc.number().enum([300]),
                ack_time: yxc.number().enum([300]),
                persistent: yxc.boolean().true(),
                mem_size: yxc.number(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res),
    []
  );
});
