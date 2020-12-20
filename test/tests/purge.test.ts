import { defineWorkflow, WorkflowStep } from "voce";
import { expect } from "chai";
import { IP } from "../util";
import { queueUri, createQueue, Message, deleteQueue } from "../common";
import { existsSync } from "fs";
import yxc from "@dotvirus/yxc";

export default defineWorkflow(async () => {
  const queueName = "purge_non_persistent";
  const queueUrl = queueUri(queueName);
  const queueFolder = `.corinth/queues/${queueName}`;

  await createQueue(queueName);

  expect(existsSync(queueFolder)).to.be.false;

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

  return {
    title: "Purge",
    onAfter: () => deleteQueue(queueName),
    baseUrl: IP,
    steps: [
      ...(() => {
        const steps: WorkflowStep[] = [];
        for (let i = 0; i < NUM_ITEMS; i++) {
          steps.push({
            title: `Enqueue item #${i}`,
            status: 202,
            method: "POST",
            url: queueUrl + "/enqueue",
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
              expect(existsSync(queueFolder)).to.be.false;
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
              persistent: yxc.boolean().false(),
              memory_size: yxc.number(),
              dead_letter: yxc.null(),
            }),
          }),
        }),
      },
      {
        title: "Purge queue",
        status: 200,
        method: "DELETE",
        url: `${queueUrl}/purge`,
        resBody: yxc.object({
          message: yxc.string().equals("Queue purged successfully"),
          status: yxc.number().equals(200),
          result: yxc.null(),
        }),
      },
      {
        title: "Queue should be empty",
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
              persistent: yxc.boolean().false(),
              memory_size: yxc.number(),
              dead_letter: yxc.null(),
            }),
          }),
        }),
        validate: () => {
          expect(existsSync(queueFolder)).to.be.false;
        },
      },
    ],
  };
});
