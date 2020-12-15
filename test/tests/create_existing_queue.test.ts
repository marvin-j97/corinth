import { IP } from "../util";
import { defineWorkflow } from "voce";
import { createQueue, deleteQueue, queueUri } from "../common";
import yxc from "@dotvirus/yxc";

export default defineWorkflow(async () => {
  const queueName = "queue_conflict";
  await createQueue(queueName);

  return {
    title: "Create conflicting queue",
    baseUrl: IP,
    onAfter: () => deleteQueue(queueName),
    steps: [
      {
        method: "PUT",
        status: 409,
        url: queueUri(queueName),
        resBody: yxc.object({
          error: yxc.boolean().true(),
          message: yxc.string().equals("Queue already exists"),
          status: yxc.number().equals(409),
        }),
      },
    ],
  };
});
