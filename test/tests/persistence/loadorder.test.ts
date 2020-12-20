import { defineWorkflow } from "voce";
import {
  getUrl,
  IP,
  persistenceTeardown,
  sleep,
  spawnCorinth,
} from "../../util";
import { createQueue, dequeue, enqueue, queueUri } from "../../common";
import yxc from "@dotvirus/yxc";
import { assert, expect } from "chai";
import { existsSync, readFileSync } from "fs";
import Axios from "axios";

export default defineWorkflow(async () => {
  const queueName = "loadorder_test";
  const queueUrl = queueUri(queueName);

  await createQueue(queueName, {
    params: {
      persistent: "true",
    },
  });

  assert(existsSync(".corinth/queues/loadorder_test/meta.json"));
  assert(!existsSync(".corinth/queues/loadorder_test/items.jsonl"));

  await enqueue(queueName, [
    {
      item: {
        index: 0,
      },
      deduplication_id: null,
    },
    {
      item: {
        index: 1,
      },
      deduplication_id: null,
    },
    {
      item: {
        index: 2,
      },
      deduplication_id: null,
    },
    {
      item: {
        index: 3,
      },
      deduplication_id: null,
    },
    {
      item: {
        index: 4,
      },
      deduplication_id: null,
    },
    {
      item: {
        index: 5,
      },
      deduplication_id: null,
    },
    {
      item: {
        index: 6,
      },
      deduplication_id: null,
    },
  ]);

  return {
    title: "Load order",
    baseUrl: IP,
    onSuccess: persistenceTeardown,
    steps: [
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
              size: yxc.number().equals(7),
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
          const itemOrder = readFileSync(
            ".corinth/queues/loadorder_test/items.jsonl",
            "utf-8"
          )
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line))
            .map((msg) => JSON.parse(msg.item).index);

          expect(itemOrder).to.deep.equal(
            itemOrder.slice().sort((a, b) => a - b)
          );
          expect(itemOrder[0]).to.equal(0);
        },
        onSuccess: async () => {
          await Axios.post(getUrl("/close"));
          await sleep(3500);
          spawnCorinth();
          await sleep(1000);
        },
      },
      {
        title: "7 items should still be queued after reload",
        status: 200,
        url: queueUrl,
        resBody: yxc.object({
          message: yxc.string().equals("Queue info retrieved successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            queue: yxc.object({
              name: yxc.string().equals(queueName),
              created_at: yxc.number().integer(),
              size: yxc.number().equals(7),
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
        validate: async () => {
          const itemOrder = readFileSync(
            ".corinth/queues/loadorder_test/items.jsonl",
            "utf-8"
          )
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line))
            .map((msg) => JSON.parse(msg.item).index);

          expect(itemOrder).to.deep.equal(
            itemOrder.slice().sort((a, b) => a - b)
          );
          expect(itemOrder[0]).to.equal(0);

          for (let i = 0; i < 2; i++) {
            await dequeue(queueName, true);
          }

          expect(
            JSON.parse(
              readFileSync(".corinth/queues/loadorder_test/meta.json", "utf-8")
            ).num_acknowledged
          ).to.equal(2);
        },
      },
      {
        title: "5 items should be queued",
        status: 200,
        url: queueUrl,
        resBody: yxc.object({
          message: yxc.string().equals("Queue info retrieved successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            queue: yxc.object({
              name: yxc.string().equals(queueName),
              created_at: yxc.number().integer(),
              size: yxc.number().equals(5),
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
        onSuccess: async () => {
          await enqueue(queueName, [
            {
              item: {
                index: 7,
              },
              deduplication_id: null,
            },
          ]);
        },
      },
      {
        title: "6 items should be queued",
        status: 200,
        url: queueUrl,
        resBody: yxc.object({
          message: yxc.string().equals("Queue info retrieved successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            queue: yxc.object({
              name: yxc.string().equals(queueName),
              created_at: yxc.number().integer(),
              size: yxc.number().equals(6),
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
        onSuccess: async () => {
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
              size: yxc.number().equals(6),
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
            ".corinth/queues/loadorder_test/items.jsonl",
            "utf-8"
          )
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line));

          expect(itemsInFile.length).to.equal(6);
          assert(
            itemsInFile.every((item) => item["$corinth_deleted"] === undefined)
          );
          assert(!existsSync(".corinth/queues/loadorder_test/items~.jsonl"));

          const itemOrder = itemsInFile.map(
            (msg) => JSON.parse(msg.item).index
          );

          expect(itemOrder).to.deep.equal(
            itemOrder.slice().sort((a, b) => a - b)
          );

          expect(itemOrder[0]).to.equal(2);
          expect(itemOrder[itemOrder.length - 1]).to.equal(7);
        },
      },
    ],
  };
});
