import { defineWorkflow } from "voce";
import { expect } from "chai";
import { IP, persistenceTeardown } from "../util";
import { deleteQueue, queueUri } from "../common";
import { existsSync } from "fs";
import yxc from "@dotvirus/yxc";

export default defineWorkflow(async () => {
  const queueName = "persistent_new_queue_test";
  const queueUrl = queueUri(queueName);

  expect(existsSync(`.corinth/queues/${queueName}/meta.json`)).to.be.false;
  expect(existsSync(`.corinth/queues/${queueName}/items.jsonl`)).to.be.false;

  return {
    title: "Create persistent queue",
    baseUrl: IP,
    onBefore: persistenceTeardown,
    onAfter: async () => {
      persistenceTeardown();
      await deleteQueue(queueName);
    },
    steps: [
      {
        method: "PUT",
        status: 201,
        url: queueUrl,
        query: {
          persistent: "true",
        },
        resBody: yxc.object({
          message: yxc.string().equals("Queue created successfully"),
          status: yxc.number().equals(201),
          result: yxc.null(),
        }),
      },
      {
        url: queueUrl,
        status: 200,
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
              disk_size: yxc.number().nullable(),
              dead_letter: yxc.null(),
              last_compacted_at: yxc.number().eq(0),
            }),
          }),
        }),
        validate: () => {
          expect(existsSync(`.corinth/queues/${queueName}/meta.json`)).to.be
            .true;
          expect(existsSync(`.corinth/queues/${queueName}/items.jsonl`)).to.be
            .false;
        },
      },
    ],
  };
});
