import ava, { before, after } from "ava";
import Axios from "axios";
import {
  getUrl,
  spawnCorinth,
  unixToHammer,
  NO_FAIL,
  persistenceTeardown,
} from "../util";
import yxc, { createExecutableSchema } from "@dotvirus/yxc";
import axiosRetry from "axios-retry";

axiosRetry(Axios, { retries: 3 });

before(persistenceTeardown);
after(persistenceTeardown);

spawnCorinth();

ava.serial("GET /", async (t) => {
  const res = await Axios.get(getUrl("/"), NO_FAIL());
  const gracePeriodSecs = 3;
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(200),
          data: yxc.object({
            message: yxc.string().equals("Server info retrieved successfully"),
            status: yxc.number().equals(200),
            result: yxc.object({
              info: yxc.object({
                name: yxc.string().equals("Corinth"),
                version: yxc.string().equals("0.2.0"),
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
        })
        .arbitrary()
    )(res).ok
  );
  t.is(res.data.result.info.uptime_secs * 1000, res.data.result.info.uptime_ms);
  const startedAt = unixToHammer(res.data.result.info.started_at);
  const NOW = Date.now();
  t.is(startedAt < NOW, true);
  t.is(startedAt > NOW - unixToHammer(gracePeriodSecs), true);
});
