import { defineWorkflow } from "voce";
import { IP, persistenceTeardown } from "../../util";
import { createQueue, queueUri } from "../../common";
import yxc from "@dotvirus/yxc";
import { assert, expect } from "chai";
import { existsSync } from "fs";
import { resolve } from "path";

export default defineWorkflow(async () => {
  const queueName = "edit_queue_persistent";
  const queueUrl = queueUri(queueName);

  await createQueue(queueName, {
    params: {
      persistent: "true",
    },
  });

  assert(existsSync(".corinth/queues/edit_queue_persistent/meta.json"));
  expect(
    require(resolve("./.corinth/queues/edit_queue_persistent/meta.json"))
      .max_length
  ).to.equal(0);
  delete require.cache[
    require.resolve(
      resolve("./.corinth/queues/edit_queue_persistent/meta.json")
    )
  ];
  assert(!existsSync(".corinth/queues/edit_queue_persistent/items.jsonl"));

  return {
    title: "Edit queue (persistent)",
    baseUrl: IP,
    onSuccess: persistenceTeardown,
    steps: [
      {
        url: queueUrl,
        status: 200,
        method: "PATCH",
        reqBody: {
          max_length: 5,
        },
        resBody: yxc.object({
          message: yxc.string().equals("Queue edited successfully"),
          status: yxc.number().equals(200),
          result: yxc.null(),
        }),
        validate: () => {
          assert(existsSync(".corinth/queues/edit_queue_persistent/meta.json"));
          expect(
            require(resolve(
              "./.corinth/queues/edit_queue_persistent/meta.json"
            )).max_length
          ).to.equal(5);
          delete require.cache[
            require.resolve(
              resolve("./.corinth/queues/edit_queue_persistent/meta.json")
            )
          ];
          assert(
            !existsSync(".corinth/queues/edit_queue_persistent/items.jsonl")
          );
        },
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
              requeue_time: yxc.number().equals(300),
              persistent: yxc.boolean().true(),
              memory_size: yxc.number(),
              disk_size: yxc.number().nullable(),
              max_length: yxc.number().eq(5),
              dead_letter: yxc.null(),
              last_compacted_at: yxc.number().eq(0),
            }),
          }),
        }),
      },
    ],
  };
});
