import ava, { before, after } from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL, countSync, sleep } from "../../util";
import { queueUrl as getQueueUrl, createQueue, Message } from "../../common";
import yxc, { createExecutableSchema } from "@dotvirus/yxc";
import { existsSync, readFileSync, rmdirSync } from "fs";

before(() => {
  try {
    rmdirSync(".corinth", { recursive: true });
  } catch (error) {}

  if (existsSync(".corinth")) {
    console.error("ERROR: Test teardown failed");
    process.exit(1);
  }
});

after(() => {
  console.log("Teardown " + __filename);
  try {
    rmdirSync(".corinth", { recursive: true });
  } catch (error) {
    console.warn("WARN: Test teardown failed");
  }
});

let corinth = spawnCorinth();

const queueName = "compaction_test";
const queueUrl = getQueueUrl(queueName);
const dequeueUrl = queueUrl + "/dequeue";
const axiosConfig = {
  ...NO_FAIL(),
  params: {
    persistent: true,
    ack: true,
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
  t.is(existsSync(".corinth/compaction_test/meta.json"), true);
  t.is(existsSync(".corinth/compaction_test/items.jsonl"), false);
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
  t.is(existsSync(".corinth/compaction_test/items.jsonl"), true);
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

ava.serial("Dequeue some items", async (t) => {
  for (let i = 0; i < 2; i++) {
    const res = await Axios.post(dequeueUrl, null, axiosConfig);
  }
  t.pass();
});

ava.serial(`${NUM_ITEMS - 2} items should be queued`, async (t) => {
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
                size: yxc.number().enum([NUM_ITEMS - 2]),
                num_deduped: yxc.number().enum([0]),
                num_unacked: yxc.number().enum([0]),
                num_dedup_hits: yxc.number().enum([0]),
                num_acknowledged: yxc.number().enum([2]),
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
  t.is(
    JSON.parse(readFileSync(".corinth/compaction_test/meta.json", "utf-8"))
      .num_acknowledged,
    2
  );

  const itemsInFile = readFileSync(
    ".corinth/compaction_test/items.jsonl",
    "utf-8"
  )
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  t.is(itemsInFile.length, NUM_ITEMS + 2);
  t.is(
    countSync(
      itemsInFile,
      (item) => typeof item["$corinth_deleted"] === "string"
    ),
    2
  );
});

ava.serial("Stop exe", async (t) => {
  corinth.kill();
  corinth = spawnCorinth();
  await sleep(1000);
  t.pass();
});

ava.serial("Queue should persist restart and be compacted", async (t) => {
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
                size: yxc.number().enum([NUM_ITEMS - 2]),
                num_deduped: yxc.number().enum([0]),
                num_unacked: yxc.number().enum([0]),
                num_dedup_hits: yxc.number().enum([0]),
                num_acknowledged: yxc.number().enum([2]),
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

  const itemsInFile = readFileSync(
    ".corinth/compaction_test/items.jsonl",
    "utf-8"
  )
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  t.is(itemsInFile.length, NUM_ITEMS - 2);
  t.is(
    itemsInFile.every((item) => item["$corinth_deleted"] === undefined),
    true
  );
  t.is(existsSync(".corinth/compaction_test/items~.jsonl"), false);
});
