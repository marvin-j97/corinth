import { IP } from "../util";
import { defineWorkflow } from "voce";
import { createQueue, enqueue, queueUri } from "../common";
import yxc from "@dotvirus/yxc";

export default defineWorkflow(async () => {
  const queueName = "queue_max_length";
  const queueUrl = queueUri(queueName);

  await createQueue(queueName, {
    params: {
      max_length: 1,
    },
  });

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

  await enqueue(queueName, [
    {
      item: testItem,
      deduplication_id: null,
    },
  ]);

  return {
    title: "Queue max length",
    baseUrl: IP,
    steps: [
      {
        title: "Enqueue 1 more item",
        status: 403,
        url: queueUrl + "/enqueue",
        method: "POST",
        reqBody,
        resBody: yxc.object({
          message: yxc.string().equals("Queue is full"),
          status: yxc.number().equals(403),
          error: yxc.boolean().true(),
        }),
      },
      {
        title: "Enqueue more items",
        status: 403,
        url: queueUrl + "/enqueue",
        method: "POST",
        reqBody: {
          messages: [
            {
              item: testItem,
              deduplication_id: null,
            },
            {
              item: testItem,
              deduplication_id: null,
            },
            {
              item: testItem,
              deduplication_id: null,
            },
          ],
        },
        resBody: yxc.object({
          message: yxc.string().equals("Queue is full"),
          status: yxc.number().equals(403),
          error: yxc.boolean().true(),
        }),
      },
      {
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
              max_length: yxc.number().eq(1),
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
