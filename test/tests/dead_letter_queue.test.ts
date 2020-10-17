import ava, { before, after } from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL, persistenceTeardown, sleep } from "../util";
import {
  queueUrl as getQueueUrl,
  createQueue,
  Message,
  MessageState,
} from "../common";
import yxc, { createExecutableSchema } from "@dotvirus/yxc";
import { existsSync } from "fs";
import axiosRetry from "axios-retry";

axiosRetry(Axios, { retries: 3 });

before(persistenceTeardown);
after(persistenceTeardown);

spawnCorinth();

const deadLetterName = "dead_letters";
const deadLetterQueueUrl = getQueueUrl(deadLetterName);

const mainName = "main_queue";
const mainQueueUrl = getQueueUrl(mainName);

ava.serial("Create main queue, non existing dead letter queue", async (t) => {
  const res = await createQueue(mainName, {
    ...NO_FAIL(),
    params: {
      dead_letter_queue_name: deadLetterName,
      requeue_time: 1,
    },
  });
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(404),
          data: yxc.object({
            message: yxc.string().equals("Dead letter target not found"),
            status: yxc.number().equals(404),
            error: yxc.boolean().true(),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("Create dead letter queue", async (t) => {
  const res = await createQueue(deadLetterName, NO_FAIL());
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
});

ava.serial("Create main queue", async (t) => {
  const res = await createQueue(mainName, {
    ...NO_FAIL(),
    params: {
      dead_letter_queue_name: deadLetterName,
      requeue_time: 1,
    },
  });
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
});

ava.serial("Main queue should exist", async (t) => {
  const res = await Axios.get(mainQueueUrl, NO_FAIL());
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
                name: yxc.string().equals(mainName),
                created_at: yxc.number().integer(),
                size: yxc.number().equals(0),
                num_deduplicating: yxc.number().equals(0),
                num_unacknowledged: yxc.number().equals(0),
                num_deduplicated: yxc.number().equals(0),
                num_acknowledged: yxc.number().equals(0),
                num_requeued: yxc.number().equals(0),
                deduplication_time: yxc.number().equals(300),
                max_length: yxc.number().eq(0),
                requeue_time: yxc.number().equals(1),
                persistent: yxc.boolean().false(),
                memory_size: yxc.number(),
                dead_letter: yxc.object({
                  name: yxc.string().eq(deadLetterName),
                  threshold: yxc.number().eq(3),
                }),
              }),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

const item0 = {
  name: "my_message",
};

ava.serial("Enqueue item", async (t) => {
  const res = await Axios.post(
    mainQueueUrl + "/enqueue",
    {
      messages: [
        {
          item: item0,
          deduplication_id: null,
        },
      ],
    },
    NO_FAIL()
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
});

ava.serial("Dequeue queue head -> item0", async (t) => {
  const res = await Axios.post(mainQueueUrl + "/dequeue", null, NO_FAIL());
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(200),
          data: yxc.object({
            message: yxc.string().equals("Request processed successfully"),
            status: yxc.number().equals(200),
            result: yxc.object({
              items: yxc.array(
                Message(
                  yxc.object({
                    name: yxc.string().equals("my_message"),
                  })
                )
              ),
              num_items: yxc.number().equals(1),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
  await sleep(1500);
});

ava.serial("Dequeue queue head 2x -> item0", async (t) => {
  const res = await Axios.post(mainQueueUrl + "/dequeue", null, NO_FAIL());
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(200),
          data: yxc.object({
            message: yxc.string().equals("Request processed successfully"),
            status: yxc.number().equals(200),
            result: yxc.object({
              items: yxc.array(
                Message(
                  yxc.object({
                    name: yxc.string().equals("my_message"),
                  })
                )
              ),
              num_items: yxc.number().equals(1),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
  await sleep(1500);
});

ava.serial("Dequeue queue head 3x -> item0", async (t) => {
  const res = await Axios.post(mainQueueUrl + "/dequeue", null, NO_FAIL());
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(200),
          data: yxc.object({
            message: yxc.string().equals("Request processed successfully"),
            status: yxc.number().equals(200),
            result: yxc.object({
              items: yxc.array(
                Message(
                  yxc.object({
                    name: yxc.string().equals("my_message"),
                  })
                )
              ),
              num_items: yxc.number().equals(1),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
  await sleep(1500);
});

ava.serial(
  "Dequeue queue head -> last attempt (no more requeues)",
  async (t) => {
    const res = await Axios.post(mainQueueUrl + "/dequeue", null, NO_FAIL());
    t.assert(
      createExecutableSchema(
        yxc
          .object({
            status: yxc.number().equals(200),
            data: yxc.object({
              message: yxc.string().equals("Request processed successfully"),
              status: yxc.number().equals(200),
              result: yxc.object({
                items: yxc.array(Message()).len(1),
                num_items: yxc.number().equals(1),
              }),
            }),
          })
          .arbitrary()
      )(res).ok
    );
    await sleep(1500);
  }
);

ava.serial("Peek queue head again -> item0", async (t) => {
  const res = await Axios.get(deadLetterQueueUrl + "/peek", NO_FAIL());
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(200),
          data: yxc.object({
            message: yxc.string().equals("Message retrieved successfully"),
            status: yxc.number().equals(200),
            result: yxc.object({
              item: Message(
                yxc.object({
                  name: yxc.string().equals("my_message"),
                }),
                yxc.number().eq(3),
                yxc.string().eq(MessageState.Failed)
              ),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("Dead letter queue should have 1 item", async (t) => {
  const res = await Axios.get(deadLetterQueueUrl, NO_FAIL());
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
                name: yxc.string().equals(deadLetterName),
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

ava.serial("Dequeue queue head -> empty main queue", async (t) => {
  const res = await Axios.post(mainQueueUrl + "/dequeue", null, NO_FAIL());
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(200),
          data: yxc.object({
            message: yxc.string().equals("Request processed successfully"),
            status: yxc.number().equals(200),
            result: yxc.object({
              items: yxc.array(Message()).len(0),
              num_items: yxc.number().equals(0),
            }),
          }),
        })
        .arbitrary()
    )(res).ok
  );
  await sleep(1500);
});
