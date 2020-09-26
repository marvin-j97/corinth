import ava, { before, after } from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL, sleep, persistenceTeardown } from "../util";
import { queueUrl as getQueueUrl, createQueue, Message } from "../common";
import yxc, { createExecutableSchema } from "@dotvirus/yxc";

before(persistenceTeardown);
after(persistenceTeardown);

spawnCorinth();

const queueName = "new_queue";
const axiosConfig = NO_FAIL();
const queueUrl = getQueueUrl(queueName);
const testItem = {
  description: "This is a test object!",
};
const reqBody = {
  messages: [
    {
      item: testItem,
      deduplication_id: "i5joaibj5oiwj5",
    },
  ],
};

ava.serial("Create volatile queue", async (t) => {
  await createQueue(queueName, {
    ...NO_FAIL(),
    params: {
      deduplication_time: 3,
    },
  });
  t.pass();
});

ava.serial("Enqueue first item", async (t) => {
  const res = await Axios.post(queueUrl + "/enqueue", reqBody, axiosConfig);
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
});

ava.serial("Enqueue more items", async (t) => {
  for (let i = 0; i < 5; i++) {
    const res = await Axios.post(queueUrl + "/enqueue", reqBody, axiosConfig);
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
                num_deduplicated: yxc.number().equals(1),
              }),
            }),
          })
          .arbitrary()
      )(res).ok
    );
  }
});

ava.serial("1 item should be queued", async (t) => {
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
                size: yxc.number().equals(1),
                num_deduplicating: yxc.number().equals(1),
                num_unacknowledged: yxc.number().equals(0),
                num_deduplicated: yxc.number().equals(5),
                num_acknowledged: yxc.number().equals(0),
                num_requeued: yxc.number().equals(0),
                deduplication_time: yxc.number().equals(3),
                requeue_time: yxc.number().equals(300),
                persistent: yxc.boolean().false(),
                memory_size: yxc.number(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
  await sleep(3000);
});

ava.serial("1 item should be queued, but no dedup anymore", async (t) => {
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
                size: yxc.number().equals(1),
                num_deduplicating: yxc.number().equals(0), // <- expired
                num_unacknowledged: yxc.number().equals(0),
                num_deduplicated: yxc.number().equals(5),
                num_acknowledged: yxc.number().equals(0),
                num_requeued: yxc.number().equals(0),
                deduplication_time: yxc.number().equals(3),
                requeue_time: yxc.number().equals(300),
                persistent: yxc.boolean().false(),
                memory_size: yxc.number(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("Enqueue item after dedup expired", async (t) => {
  const res = await Axios.post(queueUrl + "/enqueue", reqBody, axiosConfig);
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
});

ava.serial("2 items should be queued", async (t) => {
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
                size: yxc.number().equals(2),
                num_deduplicating: yxc.number().equals(1),
                num_unacknowledged: yxc.number().equals(0),
                num_deduplicated: yxc.number().equals(5),
                num_acknowledged: yxc.number().equals(0),
                num_requeued: yxc.number().equals(0),
                deduplication_time: yxc.number().equals(3),
                requeue_time: yxc.number().equals(300),
                persistent: yxc.boolean().false(),
                memory_size: yxc.number(),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});
