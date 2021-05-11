import { defineWorkflow, WorkflowStep } from "voce";
import { IP } from "../util";
import {
  queueUri,
  createQueue,
  Message,
  deleteQueue,
  enqueue,
} from "../common";
import yxc from "@dotvirus/yxc";

export default defineWorkflow(async () => {
  const queueName = "enqueue_dedup";
  const queueUrl = queueUri(queueName);
  const testItem = {
    description: "This is a test object!",
  };

  await createQueue(queueName);

  await enqueue(queueName, [
    {
      item: testItem,
      deduplication_id: "i5joaibj5oiwj5",
    },
  ]);

  const NUM_ITEMS = 10;

  return {
    title: "Enqueue item with dedup",
    baseUrl: IP,
    onAfter: () => deleteQueue(queueName),
    steps: [
      ...(() => {
        const steps: WorkflowStep[] = [];

        for (let i = 0; i < NUM_ITEMS; i++) {
          steps.push({
            title: `Enqueue attempt #${i}`,
            method: "POST",
            url: `${queueUrl}/enqueue`,
            status: 202,
            reqBody: {
              messages: [
                {
                  item: testItem,
                  deduplication_id: "i5joaibj5oiwj5",
                },
              ],
            },
            resBody: yxc.object({
              message: yxc.string().equals("Request processed successfully"),
              status: yxc.number().equals(202),
              result: yxc.object({
                items: yxc.array(Message()).len(0),
                num_enqueued: yxc.number().equals(0),
                num_deduplicated: yxc.number().equals(1),
              }),
            }),
          });
        }

        return steps;
      })(),
      {
        title: "1 item should be queued, still",
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
              num_deduplicated: yxc.number().equals(NUM_ITEMS),
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
    ],
  };
});
