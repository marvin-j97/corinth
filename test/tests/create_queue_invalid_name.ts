import { IP } from "../util";
import { defineWorkflow, WorkflowStep } from "voce";
import { createQueue, deleteQueue, queueUri } from "../common";
import yxc from "@dotvirus/yxc";
import invalidNames from "./invalid.names.fixture";

function createQueueParams(name: string): WorkflowStep {
  return {
    title: "Create queue with empty name",
    method: "PUT",
    status: 409,
    url: queueUri(name),
    resBody: yxc.object({
      error: yxc.boolean().true(),
      message: yxc.string().equals("Invalid queue name"),
      status: yxc.number().equals(400),
    }),
  };
}

export default defineWorkflow(async () => {
  const queueName = "invalid_queue_name";
  await createQueue(queueName);

  return {
    title: "Queue invalid names",
    baseUrl: IP,
    onAfter: () => deleteQueue(queueName),
    steps: [...invalidNames.map(createQueueParams)],
  };
});
