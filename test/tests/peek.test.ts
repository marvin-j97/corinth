import { IP } from "../util";
import { defineWorkflow } from "voce";
import { createQueue, enqueue, Message, queueUri } from "../common";
import yxc from "@dotvirus/yxc";

export default defineWorkflow(async () => {
  const queueName = "peek";
  const queueUrl = queueUri(queueName);
  const peekUrl = queueUrl + "/peek";

  const item0 = {
    description: "This is a test object!",
  };
  const item1 = {
    description: "This is a test object 2!",
  };

  return {
    title: "Peek",
    baseUrl: IP,
    steps: [
      {
        title: "Peek queue head -> no queue",
        status: 404,
        url: peekUrl,
        resBody: yxc.object({
          error: yxc.boolean().true(),
          message: yxc.string().equals("Queue not found"),
          status: yxc.number().equals(404),
        }),
        onSuccess: async () => {
          await createQueue(queueName);
        },
      },
      {
        title: "Peek queue head -> empty queue",
        status: 200,
        url: peekUrl,
        resBody: yxc.object({
          message: yxc.string().equals("Queue is empty"),
          status: yxc.number().equals(200),
          result: yxc.object({
            item: yxc.null(),
          }),
        }),
        onSuccess: async () => {
          await enqueue(queueName, [
            {
              item: item0,
              deduplication_id: null,
            },
          ]);
        },
      },
      {
        title: "Peek queue head -> item0",
        status: 200,
        url: peekUrl,
        resBody: yxc.object({
          message: yxc.string().equals("Message retrieved successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            item: Message(),
          }),
        }),
      },
      {
        title: "1 item should still be queued",
        status: 200,
        url: queueUrl,
        resBody: yxc.object({
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
        onSuccess: async () => {
          await enqueue(queueName, [
            {
              item: item1,
              deduplication_id: null,
            },
          ]);
        },
      },
      {
        title: "2 items should be queued",
        status: 200,
        url: queueUrl,
        resBody: yxc.object({
          message: yxc.string().equals("Queue info retrieved successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            queue: yxc.object({
              name: yxc.string().equals(queueName),
              created_at: yxc.number().integer(),
              size: yxc.number().equals(2),
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
      },
      {
        title: "Peek queue head again -> item0",
        status: 200,
        url: peekUrl,
        resBody: yxc.object({
          message: yxc.string().equals("Message retrieved successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            item: Message(),
          }),
        }),
      },
      {
        title: "2 items should still be queued",
        status: 200,
        url: queueUrl,
        resBody: yxc.object({
          message: yxc.string().equals("Queue info retrieved successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            queue: yxc.object({
              name: yxc.string().equals(queueName),
              created_at: yxc.number().integer(),
              size: yxc.number().equals(2),
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
      },
    ],
  };
});
