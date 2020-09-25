import ava, { before, after } from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL, sleep, persistenceTeardown } from "../util";
import {
  queueUrl as getQueueUrl,
  createQueue,
  Message,
  MessageState,
} from "../common";
import yxc, { createExecutableSchema } from "@dotvirus/yxc";

before(persistenceTeardown);
after(persistenceTeardown);

spawnCorinth();

const queueName = "new_queue";
const queueUrl = getQueueUrl(queueName);
const dequeueUrl = queueUrl + "/dequeue";
const peekUrl = queueUrl + "/peek";
const axiosConfig = {
  ...NO_FAIL(),
};

ava.serial("Create volatile queue", async (t) => {
  await createQueue(queueName, {
    ...NO_FAIL(),
    params: {
      requeue_time: 3,
    },
  });
  t.pass();
});

ava.serial("Dequeue queue head -> empty queue", async (t) => {
  const res = await Axios.post(dequeueUrl, null, axiosConfig);
  t.deepEqual(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().enum([200]),
          data: yxc.object({
            message: yxc.string().enum(["Request processed successfully"]),
            status: yxc.number().enum([200]),
            result: yxc.object({
              items: yxc.array(Message()).len(0),
              num_items: yxc.number().enum([0]),
            }),
          }),
        })
        .arbitrary()
    )(res),
    []
  );
});

const item0 = {
  description: "This is a test object!",
};

ava.serial("Enqueue item", async (t) => {
  const res = await Axios.post(
    queueUrl + "/enqueue",
    {
      messages: [
        {
          item: item0,
          deduplication_id: null,
        },
      ],
    },
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
});

ava.serial("1 item should be queued", async (t) => {
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
                size: yxc.number().enum([1]),
                num_deduplicating: yxc.number().enum([0]),
                num_unacknowledged: yxc.number().enum([0]),
                num_deduplicated: yxc.number().enum([0]),
                num_acknowledged: yxc.number().enum([0]),
                num_requeued: yxc.number().enum([0]),
                deduplication_time: yxc.number().enum([300]),
                requeue_time: yxc.number().enum([3]),
                persistent: yxc.boolean().false(),
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

ava.serial("Dequeue queue head -> item0", async (t) => {
  const res = await Axios.post(dequeueUrl, null, axiosConfig);
  t.deepEqual(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().enum([200]),
          data: yxc.object({
            message: yxc.string().enum(["Request processed successfully"]),
            status: yxc.number().enum([200]),
            result: yxc.object({
              items: yxc.array(
                Message(
                  yxc.object({
                    description: yxc.string().enum(["This is a test object!"]),
                  })
                )
              ),
              num_items: yxc.number().enum([1]),
            }),
          }),
        })
        .arbitrary()
    )(res),
    []
  );
});

ava.serial("1 item should be unacked", async (t) => {
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
                num_unacknowledged: yxc.number().enum([1]),
                num_deduplicated: yxc.number().enum([0]),
                num_acknowledged: yxc.number().enum([0]),
                num_requeued: yxc.number().enum([0]),
                deduplication_time: yxc.number().enum([300]),
                requeue_time: yxc.number().enum([3]),
                persistent: yxc.boolean().false(),
                memory_size: yxc.number(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res),
    []
  );
  await sleep(3000);
});

ava.serial("1 item should be queued again", async (t) => {
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
                size: yxc.number().enum([1]),
                num_deduplicating: yxc.number().enum([0]),
                num_unacknowledged: yxc.number().enum([0]),
                num_deduplicated: yxc.number().enum([0]),
                num_acknowledged: yxc.number().enum([0]),
                num_requeued: yxc.number().enum([1]),
                deduplication_time: yxc.number().enum([300]),
                requeue_time: yxc.number().enum([3]),
                persistent: yxc.boolean().false(),
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

ava.serial("Peek queue head -> item0, num_requeues: 1", async (t) => {
  const res = await Axios.get(peekUrl, axiosConfig);
  t.deepEqual(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().enum([200]),
          data: yxc.object({
            message: yxc.string().enum(["Message retrieved successfully"]),
            status: yxc.number().enum([200]),
            result: yxc.object({
              item: Message(
                yxc.object().arbitrary(),
                yxc.number().use((i) => i === 1 || "Wrong requeue counter"),
                yxc
                  .string()
                  .use(
                    (s) => s === MessageState.Requeued || "Wrong message state"
                  )
              ),
            }),
          }),
        })
        .arbitrary()
    )(res),
    []
  );
});