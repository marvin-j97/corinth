import ava, { before, after } from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL, sleep, persistenceTeardown } from "../../util";
import { queueUrl as getQueueUrl, createQueue } from "../../common";
import yxc, { createExecutableSchema } from "@dotvirus/yxc";
import { existsSync, readFileSync } from "fs";
import axiosRetry from "axios-retry";

axiosRetry(Axios, { retries: 3 });

before(persistenceTeardown);
after(persistenceTeardown);

let corinth = spawnCorinth();

const queueName = "loadorder_test";
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
            result: yxc
              .any()
              .nullable()
              .use((v) => v === null),
          }),
        })
        .arbitrary()
    )(res).ok
  );
  t.is(existsSync(".corinth/queues/loadorder_test/meta.json"), true);
  t.is(existsSync(".corinth/queues/loadorder_test/items.jsonl"), false);
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

ava.serial("Enqueue bulk", async (t) => {
  await Axios.post(
    queueUrl + "/enqueue",
    {
      messages: [
        {
          item: {
            index: 0,
          },
          deduplication_id: null,
        },
        {
          item: {
            index: 1,
          },
          deduplication_id: null,
        },
        {
          item: {
            index: 2,
          },
          deduplication_id: null,
        },
        {
          item: {
            index: 3,
          },
          deduplication_id: null,
        },
        {
          item: {
            index: 4,
          },
          deduplication_id: null,
        },
        {
          item: {
            index: 5,
          },
          deduplication_id: null,
        },
        {
          item: {
            index: 6,
          },
          deduplication_id: null,
        },
      ],
    },
    axiosConfig
  );
  t.pass();
});

ava.serial(`7 items should be queued`, async (t) => {
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
                size: yxc.number().equals(7),
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

  const itemOrder = readFileSync(
    ".corinth/queues/loadorder_test/items.jsonl",
    "utf-8"
  )
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .map((msg) => msg.item.index);

  t.deepEqual(
    itemOrder,
    itemOrder.slice().sort((a, b) => a - b)
  );
  t.is(itemOrder[0], 0);
  t.is(itemOrder[itemOrder.length - 1], itemOrder.length - 1);
});

ava.serial("Reload", async (t) => {
  corinth.kill();
  corinth = spawnCorinth();
  await sleep(1000);
  t.pass();
});

ava.serial(`7 items should still be queued after reload`, async (t) => {
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
                size: yxc.number().equals(7),
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

  const itemOrder = readFileSync(
    ".corinth/queues/loadorder_test/items.jsonl",
    "utf-8"
  )
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .map((msg) => msg.item.index);

  t.deepEqual(
    itemOrder,
    itemOrder.slice().sort((a, b) => a - b)
  );
  t.is(itemOrder[0], 0);
  t.is(itemOrder[itemOrder.length - 1], itemOrder.length - 1);
});

ava.serial("Dequeue 0 & 1", async (t) => {
  for (let i = 0; i < 2; i++) {
    await Axios.post(dequeueUrl, null, axiosConfig);
  }
  t.is(
    JSON.parse(
      readFileSync(".corinth/queues/loadorder_test/meta.json", "utf-8")
    ).num_acknowledged,
    2
  );
});

ava.serial(`5 items should be queued`, async (t) => {
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
                size: yxc.number().equals(5),
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
});

ava.serial("Enqueue index=7", async (t) => {
  await Axios.post(
    queueUrl + "/enqueue",
    {
      messages: [
        {
          item: {
            index: 7,
          },
          deduplication_id: null,
        },
      ],
    },
    axiosConfig
  );
  t.pass();
});

ava.serial(`6 items should be queued`, async (t) => {
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
                size: yxc.number().equals(6),
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
});

ava.serial("Stop exe", async (t) => {
  corinth.kill();
  corinth = spawnCorinth();
  await sleep(1000);
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
                size: yxc.number().equals(6),
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

  const itemsInFile = readFileSync(
    ".corinth/queues/loadorder_test/items.jsonl",
    "utf-8"
  )
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  t.is(itemsInFile.length, 6);
  t.is(
    itemsInFile.every((item) => item["$corinth_deleted"] === undefined),
    true
  );
  t.is(existsSync(".corinth/queues/loadorder_test/items~.jsonl"), false);

  const itemOrder = itemsInFile.map((msg) => msg.item.index);

  t.deepEqual(
    itemOrder,
    itemOrder.slice().sort((a, b) => a - b)
  );
  t.is(itemOrder[0], 2);
  t.is(itemOrder[itemOrder.length - 1], 7);
});
