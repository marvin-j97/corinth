import { defineWorkflow } from "voce";
import { IP } from "../util";
import { queueUri, createQueue, Message, enqueue } from "../common";
import yxc from "@dotvirus/yxc";

export default defineWorkflow(async () => {
  const queueName = "new_queue";
  const queueUrl = queueUri(queueName);
  const dequeueUrl = queueUrl + "/dequeue";

  const item0 = {
    description: "This is a test object!",
  };

  return {
    title: "Dequeue auto ack",
    baseUrl: IP,
    steps: [
      {
        title: "Dequeue queue head -> no queue",
        status: 404,
        url: dequeueUrl,
        method: "POST",
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
        title: "Dequeue queue head -> empty queue",
        status: 200,
        url: dequeueUrl,
        method: "POST",
        resBody: yxc.object({
          message: yxc.string().equals("Request processed successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            items: yxc.array(Message()).len(0),
            num_items: yxc.number().equals(0),
          }),
        }),
        onSuccess: async () => {
          await enqueue(queueName, [
            {
              item: item0,
              deduplication_id: null,
            },
          ]);
        },
      },
      {
        title: "Dequeue queue head -> item0",
        status: 200,
        url: dequeueUrl,
        method: "POST",
        query: {
          ack: "true",
        },
        resBody: yxc.object({
          message: yxc.string().equals("Request processed successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            items: yxc.array(
              Message(
                yxc.object({
                  description: yxc.string().equals("This is a test object!"),
                })
              )
            ),
            num_items: yxc.number().equals(1),
          }),
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
              num_acknowledged: yxc.number().equals(1),
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
        title: "Dequeue queue head -> empty queue",
        status: 200,
        url: dequeueUrl,
        method: "POST",
        resBody: yxc.object({
          message: yxc.string().equals("Request processed successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            items: yxc.array(Message()).len(0),
            num_items: yxc.number().equals(0),
          }),
        }),
      },
    ],
  };
});
