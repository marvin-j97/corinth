import { defineWorkflow } from "voce";
import { IP, sleep } from "../util";
import { queueUri, createQueue, Message, enqueue } from "../common";
import yxc from "@dotvirus/yxc";

export default defineWorkflow(async () => {
  const queueName = "new_queue";
  const queueUrl = queueUri(queueName);
  const testItem = {
    description: "This is a test object!",
  };
  const messages = [
    {
      item: testItem,
      deduplication_id: "i5joaibj5oiwj5",
    },
  ];

  await createQueue(queueName, {
    params: {
      deduplication_time: 3,
    },
  });

  await enqueue(queueName, messages);

  return {
    title: "Dedup expiration",
    baseUrl: IP,
    steps: [
      ...[0, 1, 2, 3, 4].map((x) => ({
        title: `Enqueue more items ${x}`,
        url: queueUrl + "/enqueue",
        status: 202,
        method: "POST",
        reqBody: { messages },
        resBody: yxc.object({
          message: yxc.string().equals("Request processed successfully"),
          status: yxc.number().equals(202),
          result: yxc.object({
            items: yxc.array(Message()).len(0),
            num_enqueued: yxc.number().equals(0),
            num_deduplicated: yxc.number().equals(1),
          }),
        }),
      })),
      {
        title: "1 item should be queued",
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
              num_deduplicating: yxc.number().equals(1),
              num_unacknowledged: yxc.number().equals(0),
              num_deduplicated: yxc.number().equals(5),
              num_acknowledged: yxc.number().equals(0),
              num_requeued: yxc.number().equals(0),
              deduplication_time: yxc.number().equals(3),
              max_length: yxc.number().eq(0),
              requeue_time: yxc.number().equals(300),
              persistent: yxc.boolean().false(),
              memory_size: yxc.number(),
              dead_letter: yxc.null(),
            }),
          }),
        }),
        onSuccess: async () => {
          await sleep(3000);
        },
      },
      {
        title: "1 item should be queued, but no dedup anymore",
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
              num_deduplicating: yxc.number().equals(0), // <- expired
              num_unacknowledged: yxc.number().equals(0),
              num_deduplicated: yxc.number().equals(5),
              num_acknowledged: yxc.number().equals(0),
              num_requeued: yxc.number().equals(0),
              deduplication_time: yxc.number().equals(3),
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
        title: "Enqueue item after dedup expired",
        status: 202,
        url: queueUrl + "/enqueue",
        reqBody: { messages },
        method: "POST",
        resBody: yxc.object({
          message: yxc.string().equals("Request processed successfully"),
          status: yxc.number().equals(202),
          result: yxc.object({
            items: yxc.array(Message()).len(1),
            num_enqueued: yxc.number().equals(1),
            num_deduplicated: yxc.number().equals(0),
          }),
        }),
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
              num_deduplicating: yxc.number().equals(1),
              num_unacknowledged: yxc.number().equals(0),
              num_deduplicated: yxc.number().equals(5),
              num_acknowledged: yxc.number().equals(0),
              num_requeued: yxc.number().equals(0),
              deduplication_time: yxc.number().equals(3),
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
