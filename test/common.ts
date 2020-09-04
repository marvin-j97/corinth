import Axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { getUrl } from "./util";
import { ExecutionContext } from "ava";

export function queueUrl(name: string) {
  return getUrl(`/queue/${name}`);
}

export function createQueue(name: string, opts?: AxiosRequestConfig) {
  return Axios.put(queueUrl(name), null, opts);
}

export function validateEmptyQueueResponse(
  t: ExecutionContext,
  queueName: string,
  res: AxiosResponse,
  numAcknowledged = 0,
  ack_time = 300,
  dedup_time = 300,
  persistent = false
) {
  t.is(typeof res.data.result, "object");
  t.is(typeof res.data.result.queue, "object");
  t.is(res.data.result.queue.name, queueName);
  t.is(typeof res.data.result.queue.created_at, "number");
  t.is(typeof res.data.result.queue.mem_size, "number");
  t.is(res.data.result.queue.size, 0);
  t.is(res.data.result.queue.num_deduped, 0);
  t.is(res.data.result.queue.num_unacked, 0);
  t.is(res.data.result.queue.num_dedup_hits, 0);
  t.is(res.data.result.queue.num_acknowledged, numAcknowledged);
  t.is(res.data.result.queue.dedup_time, dedup_time);
  t.is(res.data.result.queue.ack_time, ack_time);
  t.is(res.data.result.queue.persistent, persistent);
  t.is(Object.keys(res.data.result).length, 1);
  t.is(Object.keys(res.data.result.queue).length, 11);
}
