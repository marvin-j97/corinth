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
const axiosConfig = NO_FAIL();
const testItem = {
  description: "This is a test object!",
};
const reqBody = {
  messages: [
    {
      item: testItem,
      deduplication_id: null,
    },
  ],
};

ava.serial("Enqueue item to non-existing queue", async (t) => {
  const res = await Axios.post(queueUrl + "/enqueue", reqBody, axiosConfig);
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(404),
          data: yxc.object({
            error: yxc.boolean().true(),
            message: yxc.string().equals("Queue not found"),
            status: yxc.number().equals(404),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("Create volatile queue", async (t) => {
  await createQueue(queueName, NO_FAIL());
  t.pass();
});

ava.serial("Enqueue item", async (t) => {
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

ava.serial("1 item should be queued", async (t) => {
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
                size: yxc.number().equals(1),
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

const NUM_ITEMS = 10;

ava.serial(`Enqueue ${NUM_ITEMS} items`, async (t) => {
  for (let i = 0; i < NUM_ITEMS; i++) {
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
  }
});

ava.serial(`${NUM_ITEMS + 1} items should be queued`, async (t) => {
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
                size: yxc.number().equals(NUM_ITEMS + 1),
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
