import ava, { before, after } from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL, persistenceTeardown } from "../util";
import { queueUrl as getQueueUrl, createQueue, Message } from "../common";
import yxc, { createExecutableSchema } from "@dotvirus/yxc";
import axiosRetry from "axios-retry";

axiosRetry(Axios, { retries: 3 });

before(persistenceTeardown);
after(persistenceTeardown);

spawnCorinth();

const queueName = "new_queue";
const queueUrl = getQueueUrl(queueName);
const dequeueUrl = queueUrl + "/dequeue";
const axiosConfig = {
  ...NO_FAIL(),
};

ava.serial("Create volatile queue", async (t) => {
  await createQueue(queueName, NO_FAIL());
  t.pass();
});

ava.serial("Enqueue item", async (t) => {
  const res = await Axios.post(
    queueUrl + "/enqueue",
    {
      messages: [
        {
          item: {},
          deduplication_id: null,
        },
        {
          item: {},
          deduplication_id: null,
        },
        {
          item: {},
          deduplication_id: null,
        },
        {
          item: {},
          deduplication_id: null,
        },
        {
          item: {},
          deduplication_id: null,
        },
      ],
    },
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
              items: yxc.array(Message()).len(5),
              num_enqueued: yxc.number().equals(5),
              num_deduplicated: yxc.number().equals(0),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("5 items should be queued", async (t) => {
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
                num_acknowledged: yxc.number().equals(0),
                num_requeued: yxc.number().equals(0),
                deduplication_time: yxc.number().equals(300),
                max_length: yxc.number().eq(0),
                requeue_time: yxc.number().equals(300),
                persistent: yxc.boolean().false(),
                memory_size: yxc.number(),
                dead_letter: yxc.null(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("Enqueue item with dedup", async (t) => {
  const res = await Axios.post(
    queueUrl + "/enqueue",
    {
      messages: [
        {
          item: {},
          deduplication_id: "1",
        },
        {
          item: {},
          deduplication_id: "2",
        },
        {
          item: {},
          deduplication_id: "3",
        },
        {
          item: {},
          deduplication_id: "1",
        },
        {
          item: {},
          deduplication_id: "1",
        },
      ],
    },
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
              items: yxc.array(Message()).len(3),
              num_enqueued: yxc.number().equals(3),
              num_deduplicated: yxc.number().equals(2),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("8 items should be queued", async (t) => {
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
                size: yxc.number().equals(8),
                num_deduplicating: yxc.number().equals(3),
                num_unacknowledged: yxc.number().equals(0),
                num_deduplicated: yxc.number().equals(2),
                num_acknowledged: yxc.number().equals(0),
                num_requeued: yxc.number().equals(0),
                deduplication_time: yxc.number().equals(300),
                max_length: yxc.number().eq(0),
                requeue_time: yxc.number().equals(300),
                persistent: yxc.boolean().false(),
                memory_size: yxc.number(),
                dead_letter: yxc.null(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("Enqueue more items with dedup", async (t) => {
  const res = await Axios.post(
    queueUrl + "/enqueue",
    {
      messages: [
        {
          item: {},
          deduplication_id: "1",
        },
        {
          item: {},
          deduplication_id: "2",
        },
      ],
    },
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
              items: yxc.array(Message()).len(0),
              num_enqueued: yxc.number().equals(0),
              num_deduplicated: yxc.number().equals(2),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("8 items should still be queued", async (t) => {
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
                size: yxc.number().equals(8),
                num_deduplicating: yxc.number().equals(3),
                num_unacknowledged: yxc.number().equals(0),
                num_deduplicated: yxc.number().equals(4),
                num_acknowledged: yxc.number().equals(0),
                num_requeued: yxc.number().equals(0),
                deduplication_time: yxc.number().equals(300),
                max_length: yxc.number().eq(0),
                requeue_time: yxc.number().equals(300),
                persistent: yxc.boolean().false(),
                memory_size: yxc.number(),
                dead_letter: yxc.null(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("Dequeue queue head", async (t) => {
  const res = await Axios.post(dequeueUrl, null, {
    ...NO_FAIL(),
    params: {
      ack: "true",
      amount: 5,
    },
  });
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(200),
          data: yxc.object({
            message: yxc.string().equals("Request processed successfully"),
            status: yxc.number().equals(200),
            result: yxc.object({
              items: yxc.array(Message()),
              num_items: yxc.number().equals(5),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("3 items should still be queued", async (t) => {
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
                size: yxc.number().equals(3),
                num_deduplicating: yxc.number().equals(3),
                num_unacknowledged: yxc.number().equals(0),
                num_deduplicated: yxc.number().equals(4),
                num_acknowledged: yxc.number().equals(5),
                num_requeued: yxc.number().equals(0),
                deduplication_time: yxc.number().equals(300),
                max_length: yxc.number().eq(0),
                requeue_time: yxc.number().equals(300),
                persistent: yxc.boolean().false(),
                memory_size: yxc.number(),
                dead_letter: yxc.null(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("Dequeue queue head, get remaining items", async (t) => {
  const res = await Axios.post(dequeueUrl, null, {
    ...NO_FAIL(),
    params: {
      ack: "true",
      amount: 5,
    },
  });
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(200),
          data: yxc.object({
            message: yxc.string().equals("Request processed successfully"),
            status: yxc.number().equals(200),
            result: yxc.object({
              items: yxc.array(Message()),
              num_items: yxc.number().equals(3),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("0 items should still be queued", async (t) => {
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
                num_deduplicating: yxc.number().equals(3),
                num_unacknowledged: yxc.number().equals(0),
                num_deduplicated: yxc.number().equals(4),
                num_acknowledged: yxc.number().equals(8),
                num_requeued: yxc.number().equals(0),
                deduplication_time: yxc.number().equals(300),
                max_length: yxc.number().eq(0),
                requeue_time: yxc.number().equals(300),
                persistent: yxc.boolean().false(),
                memory_size: yxc.number(),
                dead_letter: yxc.null(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});
