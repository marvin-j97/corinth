import ava from "ava";
import Axios from "axios";
import { getUrl, spawnCorinth, unixToHammer, NO_FAIL } from "../util";

spawnCorinth();

ava.serial("GET /", async (t) => {
  const res = await Axios.get(getUrl("/"), NO_FAIL());
  t.is(res.status, 200);
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.info, "object");
  t.is(res.data.result.info.name, "Corinth");
  t.is(typeof res.data.result.info.version, "string");
  const gracePeriodSecs = 3;
  t.is(res.data.result.info.uptime_secs < gracePeriodSecs, true);
  t.is(res.data.result.info.uptime_secs * 1000, res.data.result.info.uptime_ms);
  const startedAt = unixToHammer(res.data.result.info.started_at);
  const NOW = Date.now();
  t.is(startedAt < NOW, true);
  t.is(startedAt > NOW - unixToHammer(gracePeriodSecs), true);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.info).length, 5);
});
