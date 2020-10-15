import ava, { before, after } from "ava";
import Axios from "axios";
import {
  spawnCorinth,
  NO_FAIL,
  countSync,
  sleep,
  persistenceTeardown,
} from "../../util";
import { queueUrl as getQueueUrl, createQueue, Message } from "../../common";
import yxc, { createExecutableSchema } from "@dotvirus/yxc";
import { existsSync, readFileSync } from "fs";
import axiosRetry from "axios-retry";

axiosRetry(Axios, { retries: 3 });

before(persistenceTeardown);
after(persistenceTeardown);

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
  t.assert(existsSync(".corinth/queues/compaction_test/meta.json"));
  t.assert(!existsSync(".corinth/queues/compaction_test/items.jsonl"));
});

ava.serial("Queue should be empty", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
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
                max_length: yxc.number().eq(0),
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
    t.assert(
      createExecutableSchema(
        yxc
          .object({
            status: yxc.number().equals(202),
            data: yxc.object({
              message: yxc.string().equals("Request processed successfully"),
              status: yxc.number().equals(202),
              result: yxc.object({
                items: yxc.array(Message()).len(1),
                num_enqueued: yxc.number().equals(1),
                num_deduplicated: yxc.number().equals(0),
              }),
            }),
          })
          .arbitrary()
      )(res).ok
    );
  }
  t.assert(existsSync(".corinth/queues/compaction_test/items.jsonl"));
});

ava.serial(`${NUM_ITEMS} items should be queued`, async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
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
                size: yxc.number().equals(NUM_ITEMS),
                num_deduplicating: yxc.number().equals(0),
                num_unacknowledged: yxc.number().equals(0),
                num_deduplicated: yxc.number().equals(0),
                num_acknowledged: yxc.number().equals(0),
                num_requeued: yxc.number().equals(0),
                deduplication_time: yxc.number().equals(300),
                max_length: yxc.number().eq(0),
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
});

ava.serial("Dequeue some items", async (t) => {
  for (let i = 0; i < 2; i++) {
    const res = await Axios.post(dequeueUrl, null, axiosConfig);
  }
  t.pass();
});

ava.serial(`${NUM_ITEMS - 2} items should be queued`, async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
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
                size: yxc.number().equals(NUM_ITEMS - 2),
                num_deduplicating: yxc.number().equals(0),
                num_unacknowledged: yxc.number().equals(0),
                num_deduplicated: yxc.number().equals(0),
                num_acknowledged: yxc.number().equals(2),
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

  t.is(
    JSON.parse(
      readFileSync(".corinth/queues/compaction_test/meta.json", "utf-8")
    ).num_acknowledged,
    2
  );

  const itemsInFile = readFileSync(
    ".corinth/queues/compaction_test/items.jsonl",
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

ava.serial("Call compact route", async (t) => {
  await Axios.post(queueUrl + "/compact", axiosConfig);
  t.pass();
});

ava.serial("Queue should persist restart and be compacted", async (t) => {
  const res = await Axios.get(queueUrl, axiosConfig);
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
                size: yxc.number().equals(NUM_ITEMS - 2),
                num_deduplicating: yxc.number().equals(0),
                num_unacknowledged: yxc.number().equals(0),
                num_deduplicated: yxc.number().equals(0),
                num_acknowledged: yxc.number().equals(2),
                num_requeued: yxc.number().equals(0),
                deduplication_time: yxc.number().equals(300),
                max_length: yxc.number().eq(0),
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

  const itemsInFile = readFileSync(
    ".corinth/queues/compaction_test/items.jsonl",
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
  t.assert(!existsSync(".corinth/queues/compaction_test/items~.jsonl"));
});
