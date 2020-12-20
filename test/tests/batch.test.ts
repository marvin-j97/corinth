import { IP } from "../util";
import { defineWorkflow } from "voce";
import { createQueue, Message, queueUri } from "../common";
import yxc from "@dotvirus/yxc";

export default defineWorkflow(async () => {
  const queueName = "new_queue";
  const queueUrl = queueUri(queueName);
  const dequeueUrl = queueUrl + "/dequeue";

  await createQueue(queueName);

  return {
    title: "Batch",
    baseUrl: IP,
    steps: [
      {
        title: "Enqueue item",
        status: 202,
        url: queueUrl + "/enqueue",
        method: "POST",
        reqBody: {
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
        resBody: yxc.object({
          message: yxc.string().equals("Request processed successfully"),
          status: yxc.number().equals(202),
          result: yxc.object({
            items: yxc.array(Message()).len(5),
            num_enqueued: yxc.number().equals(5),
            num_deduplicated: yxc.number().equals(0),
          }),
        }),
      },
      {
        title: "5 items should be queued",
        status: 200,
        url: queueUrl,
        resBody: yxc.object({
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
      },
      {
        title: "Enqueue item with dedup",
        status: 202,
        url: queueUrl + "/enqueue",
        method: "POST",
        reqBody: {
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
        resBody: yxc.object({
          message: yxc.string().equals("Request processed successfully"),
          status: yxc.number().equals(202),
          result: yxc.object({
            items: yxc.array(Message()).len(3),
            num_enqueued: yxc.number().equals(3),
            num_deduplicated: yxc.number().equals(2),
          }),
        }),
      },
      {
        title: "8 items should be queued",
        status: 200,
        url: queueUrl,
        resBody: yxc.object({
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
      },
      {
        title: "Enqueue more items with dedup",
        status: 202,
        url: queueUrl + "/enqueue",
        method: "POST",
        reqBody: {
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
        resBody: yxc.object({
          message: yxc.string().equals("Request processed successfully"),
          status: yxc.number().equals(202),
          result: yxc.object({
            items: yxc.array(Message()).len(0),
            num_enqueued: yxc.number().equals(0),
            num_deduplicated: yxc.number().equals(2),
          }),
        }),
      },
      {
        title: "8 items should still be queued",
        status: 200,
        url: queueUrl,
        resBody: yxc.object({
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
      },
      {
        title: "Dequeue queue head",
        status: 200,
        url: dequeueUrl,
        method: "POST",
        query: {
          ack: "true",
          amount: "5",
        },
        resBody: yxc.object({
          message: yxc.string().equals("Request processed successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            items: yxc.array(Message()),
            num_items: yxc.number().equals(5),
          }),
        }),
      },
      {
        title: "3 items should still be queued",
        status: 200,
        url: queueUrl,
        resBody: yxc.object({
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
      },
      {
        title: "Dequeue queue head, get remaining items",
        status: 200,
        url: dequeueUrl,
        method: "POST",
        query: {
          ack: "true",
          amount: "5",
        },
        resBody: yxc.object({
          message: yxc.string().equals("Request processed successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            items: yxc.array(Message()),
            num_items: yxc.number().equals(3),
          }),
        }),
      },
      {
        title: "0 items should still be queued",
        status: 200,
        url: queueUrl,
        resBody: yxc.object({
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
      },
    ],
  };
});
