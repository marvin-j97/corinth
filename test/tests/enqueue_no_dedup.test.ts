import { defineWorkflow, WorkflowStep } from "voce";
import { IP } from "../util";
import { queueUri, createQueue, Message, deleteQueue } from "../common";
import yxc from "@dotvirus/yxc";

export default defineWorkflow(async () => {
  const queueName = "enqueue_no_dedup";
  const queueUrl = queueUri(queueName);
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

  const NUM_ITEMS = 10;

  return {
    title: "Enqueue item (no dedup)",
    baseUrl: IP,
    onAfter: () => deleteQueue(queueName),
    steps: [
      {
        status: 404,
        url: queueUrl + "/enqueue",
        method: "POST",
        reqBody,
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
        status: 202,
        url: queueUrl + "/enqueue",
        method: "POST",
        reqBody,
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
      },
      ...(() => {
        const steps: WorkflowStep[] = [];
        for (let i = 0; i < NUM_ITEMS; i++) {
          steps.push({
            title: `Enqueue item #${i}`,
            status: 202,
            method: "POST",
            url: queueUrl + "/enqueue",
            reqBody,
            resBody: yxc.object({
              message: yxc.string().equals("Request processed successfully"),
              status: yxc.number().equals(202),
              result: yxc.object({
                items: yxc.array(Message()).len(1),
                num_enqueued: yxc.number().equals(1),
                num_deduplicated: yxc.number().equals(0),
              }),
            }),
          });
        }
        return steps;
      })(),
      {
        title: `${NUM_ITEMS + 1} items should be queued`,
        status: 200,
        url: queueUrl,
        resBody: yxc.object({
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
      },
    ],
  };
});
