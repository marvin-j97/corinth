import { IP } from "../util";
import { defineWorkflow } from "voce";
import { queueUri } from "../common";
import yxc from "@dotvirus/yxc";

export default defineWorkflow(async () => {
  const queueName = "new_queue";
  const queueUrl = queueUri(queueName);

  return {
    title: "Queue shouldn't exist",
    baseUrl: IP,
    steps: [
      {
        status: 404,
        url: queueUrl,
        resBody: yxc.object({
          status: yxc.number().equals(404),
          error: yxc.boolean().true(),
          message: yxc.string().equals("Queue not found"),
        }),
      },
    ],
  };
});
