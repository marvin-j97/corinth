import { IP } from "../util";
import { defineWorkflow } from "voce";
import { createQueue } from "../common";
import yxc from "@dotvirus/yxc";
import { expect } from "chai";

export default defineWorkflow(async () => {
  const names = ["asd", "peter", "hello", "paradise_circus", "test", "zzz"];
  for (const name of names) {
    await createQueue(name);
  }

  const emptyQueueInfo = yxc.object({
    name: yxc.string(),
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
  });

  return {
    title: "List queues",
    baseUrl: IP,
    steps: [
      {
        status: 200,
        url: "/queues",
        resBody: yxc.object({
          message: yxc.string().equals("Queue list retrieved successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            queues: yxc.object({
              items: yxc.array(emptyQueueInfo).len(names.length),
              length: yxc.number().equals(names.length),
            }),
          }),
        }),
        validate: ({ response }) => {
          const res = response as any;
          expect(
            res.data.result.queues.items
              .map((q: { name: string }) => q.name)
              .sort()
          ).to.deep.equal(names.slice().sort());
        },
      },
    ],
  };
});
