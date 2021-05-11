import { defineWorkflow } from "voce";
import {
  createQueue,
  enqueue,
  Message,
  MessageState,
  queueUri,
} from "../common";
import { IP, sleep } from "../util";
import yxc from "@dotvirus/yxc";

export default defineWorkflow(async () => {
  const queueName = "ack_expiration";
  const queueUrl = queueUri(queueName);

  const dequeueUrl = queueUrl + "/dequeue";
  const peekUrl = queueUrl + "/peek";

  const item0 = {
    description: "This is a test object!",
  };

  await createQueue(queueName, {
    params: {
      requeue_time: 3,
    },
  });

  return {
    title: "Ack expiration",
    baseUrl: IP,
    steps: [
      {
        title: "Dequeue queue head -> empty queue",
        status: 200,
        url: dequeueUrl,
        method: "POST",
        resBody: yxc.object({
          message: yxc.string().equals("Request processed successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            items: yxc.array(Message()).len(0),
            num_items: yxc.number().equals(0),
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
        title: "Dequeue queue head -> item0",
        status: 200,
        url: dequeueUrl,
        method: "POST",
        resBody: yxc.object({
          message: yxc.string().equals("Request processed successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            items: yxc.array(
              Message(
                yxc.object({
                  description: yxc.string().equals("This is a test object!"),
                })
              )
            ),
            num_items: yxc.number().equals(1),
          }),
        }),
      },
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
              requeue_time: yxc.number().equals(3),
              persistent: yxc.boolean().false(),
              memory_size: yxc.number(),
              disk_size: yxc.number().nullable(),
              dead_letter: yxc.null(),
              last_compacted_at: yxc.number().eq(0),
            }),
          }),
        }),
        onSuccess: () => sleep(3000),
      },
      {
        title: "1 item should be queued again",
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
              num_requeued: yxc.number().equals(1),
              deduplication_time: yxc.number().equals(300),
              max_length: yxc.number().eq(0),
              requeue_time: yxc.number().equals(3),
              persistent: yxc.boolean().false(),
              memory_size: yxc.number(),
              disk_size: yxc.number().nullable(),
              dead_letter: yxc.null(),
              last_compacted_at: yxc.number().eq(0),
            }),
          }),
        }),
      },
      {
        title: "Peek queue head -> item0, num_requeues: 1",
        status: 200,
        url: peekUrl,
        resBody: yxc.object({
          message: yxc.string().equals("Message retrieved successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            item: Message(
              yxc.object().arbitrary(),
              yxc.number().eq(1),
              yxc.string().eq(MessageState.Requeued)
            ),
          }),
        }),
      },
    ],
  };
});
