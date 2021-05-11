import { IP, sleep } from "../util";
import { defineWorkflow } from "voce";
import {
  createQueue,
  deleteQueue,
  dequeue,
  enqueue,
  Message,
  MessageState,
  queueUri,
} from "../common";
import yxc from "@dotvirus/yxc";

export default defineWorkflow(async () => {
  const deadLetterName = "dead_letters";
  const deadLetterQueueUrl = queueUri(deadLetterName);

  const mainName = "main_queue";
  const mainQueueUrl = queueUri(mainName);

  const item0 = {
    name: "my_message",
  };

  return {
    title: "Dead letter queue",
    baseUrl: IP,
    onAfter: async () => {
      await dequeue(deadLetterName);
      await deleteQueue(mainName);
      await deleteQueue(deadLetterName);
    },
    steps: [
      {
        title: "Create main queue, non existing dead letter queue",
        status: 404,
        method: "PUT",
        url: mainQueueUrl,
        query: {
          dead_letter_queue_name: deadLetterName,
          requeue_time: "1",
          persistent: "false",
        },
        resBody: yxc.object({
          message: yxc.string().equals("Dead letter target not found"),
          status: yxc.number().equals(404),
          error: yxc.boolean().true(),
        }),
        onSuccess: async () => {
          await createQueue(deadLetterName);
        },
      },
      {
        title: "Create main queue",
        status: 201,
        method: "PUT",
        url: mainQueueUrl,
        query: {
          dead_letter_queue_name: deadLetterName,
          requeue_time: "1",
          persistent: "false",
        },
        resBody: yxc.object({
          message: yxc.string().equals("Queue created successfully"),
          status: yxc.number().equals(201),
          result: yxc.null(),
        }),
      },
      {
        title: "Move item to DLQ",
        status: 200,
        url: mainQueueUrl,
        resBody: yxc.object({
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
              disk_size: yxc.number().nullable(),
              dead_letter: yxc.object({
                name: yxc.string().eq(deadLetterName),
                threshold: yxc.number().eq(3),
              }),
              last_compacted_at: yxc.number().eq(0),
            }),
          }),
        }),
        onSuccess: async () => {
          // Enqueue item
          await enqueue(mainName, [
            {
              item: item0,
              deduplication_id: null,
            },
          ]);
          // Dequeue queue head -> item0
          await dequeue(mainName);
          await sleep(1500);
          // Dequeue queue head 2x -> item0
          await dequeue(mainName);
          await sleep(1500);
          // Dequeue queue head 3x -> item0
          await dequeue(mainName);
          await sleep(1500);
          // Dequeue queue head -> last attempt (no more requeues)
          await dequeue(mainName);
          await sleep(1500);
        },
      },
      {
        title: "DLQ should contain item",
        status: 200,
        url: `${deadLetterQueueUrl}/peek`,
        resBody: yxc.object({
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
      },
      {
        title: "DLQ should be length 1",
        status: 200,
        url: deadLetterQueueUrl,
        resBody: yxc.object({
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
              disk_size: yxc.number().nullable(),
              dead_letter: yxc.null(),
              last_compacted_at: yxc.number().eq(0),
            }),
          }),
        }),
      },
      {
        title: "Dequeue queue head -> empty main queue",
        url: `${mainQueueUrl}/dequeue`,
        method: "POST",
        status: 200,
        resBody: yxc.object({
          message: yxc.string().equals("Request processed successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            items: yxc.array(Message()).len(0),
            num_items: yxc.number().equals(0),
          }),
        }),
      },
      {
        status: 403,
        title: "Try delete used DLQ",
        url: deadLetterQueueUrl,
        method: "DELETE",
        resBody: yxc.object({
          message: yxc.string().equals("Dead letter queue is in use"),
          status: yxc.number().equals(403),
          error: yxc.boolean().true(),
        }),
      },
    ],
  };
});
