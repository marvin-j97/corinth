import yxc from "@dotvirus/yxc";
import { IP, persistenceTeardown } from "../util";
import { defineWorkflow } from "voce";

export default defineWorkflow(async () => {
  return {
    title: "Root",
    baseUrl: IP,
    steps: [
      {
        status: 200,
        url: "/",
        onBefore: persistenceTeardown,
        onAfter: persistenceTeardown,
        resBody: yxc.object({
          message: yxc.string().equals("Server info retrieved successfully"),
          status: yxc.number().equals(200),
          result: yxc.object({
            info: yxc.object({
              name: yxc.string().equals("Corinth"),
              version: yxc.string().equals("0.3.1"),
              uptime_secs: yxc.number().natural(),
              started_at: yxc.number().natural(),
              uptime_ms: yxc.number().natural(),
            }),
          }),
        }),
      },
    ],
  };
});
