import { defineWorkflow, WorkflowStep } from "voce";
import {
  countSync,
  getUrl,
  IP,
  persistenceTeardown,
  sleep,
  spawnCorinth,
} from "../../util";
import { createQueue, dequeue, Message, queueUri } from "../../common";
import yxc from "@dotvirus/yxc";
import { assert, expect } from "chai";
import { existsSync, readFileSync } from "fs";
import Axios from "axios";

export default defineWorkflow(async () => {
  await Axios.post(getUrl("/close"));
  await sleep(3500);
  spawnCorinth(undefined, 0);

  persistenceTeardown();

  const queueName = "compaction_test";
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

  assert(existsSync(".corinth/queues/compaction_test/meta.json"));
  assert(!existsSync(".corinth/queues/compaction_test/items.jsonl"));

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
              assert(existsSync(".corinth/queues/compaction_test/items.jsonl"));
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
        onSuccess: async () => {
          for (let i = 0; i < 2; i++) {
            await dequeue(queueName, true);
          }
        },
      },
      {
        title: `${NUM_ITEMS - 2} items should be queued`,
        status: 200,
        url: queueUrl,
        resBody: yxc.object({
          message: yxc.string().equals("Queue info retrieved successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            queue: yxc.object({
              name: yxc.string().equals(queueName),
              created_at: yxc.number().integer(),
              size: yxc.number().equals(NUM_ITEMS - 2),
              num_deduplicating: yxc.number().equals(0),
              num_unacknowledged: yxc.number().equals(0),
              num_deduplicated: yxc.number().equals(0),
              num_acknowledged: yxc.number().equals(2),
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
        validate: async () => {
          expect(
            JSON.parse(
              readFileSync(".corinth/queues/compaction_test/meta.json", "utf-8")
            ).num_acknowledged
          ).to.equal(2);

          const itemsInFile = readFileSync(
            ".corinth/queues/compaction_test/items.jsonl",
            "utf-8"
          )
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line));

          expect(itemsInFile.length).to.equal(NUM_ITEMS + 2);
          expect(
            countSync(
              itemsInFile,
              (item) => typeof item["$corinth_deleted"] === "string"
            )
          ).to.equal(2);

          await Axios.post(getUrl("/close"));
          await sleep(3500);
          spawnCorinth();
          await sleep(1000);
        },
      },
      {
        title: "Queue should persist restart and be compacted",
        status: 200,
        url: queueUrl,
        resBody: yxc.object({
          message: yxc.string().equals("Queue info retrieved successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            queue: yxc.object({
              name: yxc.string().equals(queueName),
              created_at: yxc.number().integer(),
              size: yxc.number().equals(NUM_ITEMS - 2),
              num_deduplicating: yxc.number().equals(0),
              num_unacknowledged: yxc.number().equals(0),
              num_deduplicated: yxc.number().equals(0),
              num_acknowledged: yxc.number().equals(2),
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
          const itemsInFile = readFileSync(
            ".corinth/queues/compaction_test/items.jsonl",
            "utf-8"
          )
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line));

          expect(itemsInFile.length).to.equal(NUM_ITEMS - 2);
          assert(
            itemsInFile.every((item) => item["$corinth_deleted"] === undefined)
          );
          assert(!existsSync(".corinth/queues/compaction_test/items~.jsonl"));
        },
      },
    ],
  };
});
