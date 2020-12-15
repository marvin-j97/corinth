import yxc from "@dotvirus/yxc";
import { IP, unixToHammer, persistenceTeardown } from "../util";
import { defineWorkflow } from "voce";
import { expect } from "chai";

export default defineWorkflow(async () => {
  const gracePeriodSecs = 3;

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
              version: yxc.string().equals("0.3.0"),
              uptime_secs: yxc.number().integer().min(0).max(gracePeriodSecs),
              started_at: yxc.number().integer(),
              uptime_ms: yxc
                .number()
                .integer()
                .min(0)
                .max(gracePeriodSecs * 1000),
            }),
          }),
        }),
        validate: ({ response }) => {
          const res = response as any;
          const startedAt = unixToHammer(res.data.result.info.started_at);
          const NOW = Date.now();

          expect(res.data.result.info.uptime_ms).to.equal(
            res.data.result.info.uptime_secs * 1000
          );
          expect(startedAt).to.be.lessThan(NOW);
          expect(startedAt).to.be.greaterThan(
            NOW - unixToHammer(gracePeriodSecs)
          );
        },
      },
    ],
  };
});
