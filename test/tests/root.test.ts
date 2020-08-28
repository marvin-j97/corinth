import ava from "ava";
import Axios from "axios";
import { getUrl, spawnCorinth, unixToHammer, NO_FAIL } from "../util";

spawnCorinth();

ava.serial("GET /", async (t) => {
  const res = await Axios.get(getUrl("/"), NO_FAIL);
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(res.data.result.name, "Corinth");
  t.is(typeof res.data.result.version, "string");
  const gracePeriodSecs = 3;
  t.is(res.data.result.uptime_secs < gracePeriodSecs, true);
  t.is(res.data.result.uptime_secs * 1000, res.data.result.uptime_ms);
  const startedAt = unixToHammer(res.data.result.started_at);
  const NOW = Date.now();
  t.is(startedAt < NOW, true);
  t.is(startedAt > NOW - unixToHammer(gracePeriodSecs), true);
  t.is(Object.keys(res.data.result).length, 5);
});
