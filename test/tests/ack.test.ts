import { defineWorkflow } from "voce";
import {
  createQueue,
  dequeue,
  enqueue,
  Message,
  MessageState,
  queueUri,
} from "../common";
import { IP, sleep } from "../util";
import yxc from "@dotvirus/yxc";

export default defineWorkflow(async () => {
  const queueName = "new_queue";
  const queueUrl = queueUri(queueName);
  const dequeueUrl = queueUrl + "/dequeue";

  await createQueue(queueName);

  const item0 = {
    description: "This is a test object!",
  };

  const result = await enqueue(queueName, [
    {
      item: item0,
      deduplication_id: null,
    },
  ]);
  let messageId = result.items[0].id;

  await dequeue(queueName);

  return {
    title: "ACK",
    baseUrl: IP,
    steps: [
      {
        title: "1 item should be unacked",
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
              num_deduplicating: yxc.number().equals(0),
              num_unacknowledged: yxc.number().equals(1),
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
        title: "Ack item",
        status: 200,
        url: `${queueUrl}/${messageId}/ack`,
        method: "POST",
        resBody: yxc.object({
          message: yxc.string().equals("Message reception acknowledged"),
          status: yxc.number().equals(200),
          result: yxc.null(),
        }),
      },
      {
        title: "1 item should be acked",
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
              num_deduplicating: yxc.number().equals(0),
              num_unacknowledged: yxc.number().equals(0),
              num_deduplicated: yxc.number().equals(0),
              num_acknowledged: yxc.number().equals(1),
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
        title: "Ack item again -> 404",
        status: 404,
        url: `${queueUrl}/${messageId}/ack`,
        method: "POST",
        resBody: yxc.object({
          error: yxc.boolean().true(),
          message: yxc.string().equals("Message not found"),
          status: yxc.number().equals(404),
        }),
      },
      {
        title: "1 item should still be acked",
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
              num_deduplicating: yxc.number().equals(0),
              num_unacknowledged: yxc.number().equals(0),
              num_deduplicated: yxc.number().equals(0),
              num_acknowledged: yxc.number().equals(1),
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
