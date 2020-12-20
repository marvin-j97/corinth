import { defineWorkflow, WorkflowStep } from "voce";
import { IP, persistenceTeardown } from "../../util";
import { createQueue, Message, queueUri } from "../../common";
import yxc from "@dotvirus/yxc";
import { assert } from "chai";
import { existsSync } from "fs";

export default defineWorkflow(async () => {
  persistenceTeardown();

  const queueName = "purge";
  const queueUrl = queueUri(queueName);

  const NUM_ITEMS = 10;

  const testItem = {
    description: "This is a test object!",
  };
  const reqBody = (index: number) => ({
    messages: [
      {
        item: {
          ...testItem,
          index,
        },
        deduplication_id: null,
      },
    ],
  });

  await createQueue(queueName, {
    params: {
      persistent: "true",
    },
  });

  assert(existsSync(".corinth/queues/purge/meta.json"));
  assert(!existsSync(".corinth/queues/purge/items.jsonl"));

  return {
    title: "Compaction test",
    baseUrl: IP,
    onSuccess: persistenceTeardown,
    steps: [
      ...(() => {
        const steps: WorkflowStep[] = [];

        for (let i = 0; i < NUM_ITEMS; i++) {
          steps.push({
            title: `Enqueue item ${i + 1}/${NUM_ITEMS}`,
            status: 202,
            url: queueUrl + "/enqueue",
            method: "POST",
            reqBody: reqBody(i),
            resBody: yxc.object({
              message: yxc.string().equals("Request processed successfully"),
              status: yxc.number().equals(202),
              result: yxc.object({
                items: yxc.array(Message()).len(1),
                num_enqueued: yxc.number().equals(1),
                num_deduplicated: yxc.number().equals(0),
              }),
            }),
            validate: () => {
              assert(existsSync(".corinth/queues/purge/items.jsonl"));
            },
          });
        }

        return steps;
      })(),
      {
        title: `${NUM_ITEMS} items should be queued`,
        status: 200,
        url: queueUrl,
        resBody: yxc.object({
          message: yxc.string().equals("Queue info retrieved successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            queue: yxc.object({
              name: yxc.string().equals(queueName),
              created_at: yxc.number().integer(),
              size: yxc.number().equals(NUM_ITEMS),
              num_deduplicating: yxc.number().equals(0),
              num_unacknowledged: yxc.number().equals(0),
              num_deduplicated: yxc.number().equals(0),
              num_acknowledged: yxc.number().equals(0),
              num_requeued: yxc.number().equals(0),
              deduplication_time: yxc.number().equals(300),
              max_length: yxc.number().eq(0),
              requeue_time: yxc.number().equals(300),
              persistent: yxc.boolean().true(),
              memory_size: yxc.number(),
              dead_letter: yxc.null(),
            }),
          }),
        }),
      },
      {
        title: "Purge queue",
        status: 200,
        url: queueUrl + "/purge",
        method: "DELETE",
        resBody: yxc.object({
          message: yxc.string().equals("Queue purged successfully"),
          status: yxc.number().equals(200),
          result: yxc.null(),
        }),
      },
      {
        title: "Queue should be purged",
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
              deduplication_time: yxc.number().equals(300),
              max_length: yxc.number().eq(0),
              requeue_time: yxc.number().equals(300),
              persistent: yxc.boolean().true(),
              memory_size: yxc.number(),
              dead_letter: yxc.null(),
            }),
          }),
        }),
        validate: () => {
          assert(existsSync(".corinth/queues/purge/meta.json"));
          assert(!existsSync(".corinth/queues/purge/items.jsonl"));
        },
      },
    ],
  };
});
