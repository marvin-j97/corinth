import { IP } from "../util";
import { defineWorkflow } from "voce";
import { createQueue, deleteQueue, queueUri } from "../common";
import yxc from "@dotvirus/yxc";

export default defineWorkflow(async () => {
  const queueName = "edit_queue";
  const queueUrl = queueUri(queueName);
  await createQueue(queueName);

  return {
    title: "Edit queue",
    onAfter: () => deleteQueue(queueName),
    baseUrl: IP,
    steps: [
      {
        method: "PATCH",
        status: 200,
        url: queueUrl,
        reqBody: {
          deduplication_time: 7,
          requeue_time: 4,
        },
        resBody: yxc.object({
          message: yxc.string().equals("Queue edited successfully"),
          status: yxc.number().equals(200),
          result: yxc.null(),
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
              size: yxc.number().equals(0),
              num_deduplicating: yxc.number().equals(0),
              num_unacknowledged: yxc.number().equals(0),
              num_deduplicated: yxc.number().equals(0),
              num_acknowledged: yxc.number().equals(0),
              num_requeued: yxc.number().equals(0),
              deduplication_time: yxc.number().equals(7),
              max_length: yxc.number().eq(0),
              requeue_time: yxc.number().equals(4),
              persistent: yxc.boolean().false(),
              memory_size: yxc.number(),
              dead_letter: yxc.null(),
            }),
          }),
        }),
      },
      {
        method: "PATCH",
        status: 200,
        url: queueUrl,
        reqBody: {
          deduplication_time: 26,
        },
        resBody: yxc.object({
          message: yxc.string().equals("Queue edited successfully"),
          status: yxc.number().equals(200),
          result: yxc.null(),
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
              size: yxc.number().equals(0),
              num_deduplicating: yxc.number().equals(0),
              num_unacknowledged: yxc.number().equals(0),
              num_deduplicated: yxc.number().equals(0),
              num_acknowledged: yxc.number().equals(0),
              num_requeued: yxc.number().equals(0),
              deduplication_time: yxc.number().equals(26),
              max_length: yxc.number().eq(0),
              requeue_time: yxc.number().equals(4),
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
