import ava from "ava";
import Axios from "axios";
import { getUrl, spawnCorinth, unixToHammer, NO_FAIL } from "../util";

spawnCorinth();

ava.serial("GET /", async (t) => {
  const res = await Axios.get(getUrl("/"), NO_FAIL);
  t.is(res.status, 200);
  t.is(typeof res.data, "object");
  t.is(res.data.name, "Corinth");
  t.is(typeof res.data.version, "string");
  const gracePeriodSecs = 3;
  t.is(res.data.uptime_secs < gracePeriodSecs, true);
  t.is(res.data.uptime_secs * 1000, res.data.uptime_ms);
  const startedAt = unixToHammer(res.data.started_at);
  const NOW = Date.now();
  t.is(startedAt < NOW, true);
  t.is(startedAt > NOW - unixToHammer(gracePeriodSecs), true);
  t.is(Object.keys(res.data).length, 5);
});
