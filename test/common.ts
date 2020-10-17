import Axios, { AxiosRequestConfig } from "axios";
import { getUrl } from "./util";
import yxc from "@dotvirus/yxc";
import axiosRetry from "axios-retry";

axiosRetry(Axios, { retries: 3 });

export enum MessageState {
  Pending = "Pending",
  Requeued = "Requeued",
  Failed = "Failed",
}

export const Message = (
  item = yxc.object().arbitrary(),
  num_requeues = yxc.number().natural({ withZero: true }),
  state = yxc.string().enum(Object.values(MessageState))
) =>
  yxc.object({
    id: yxc.string(),
    queued_at: yxc.number().natural(),
    updated_at: yxc.number().natural(),
    item,
    state,
    num_requeues,
  });

export function queueUrl(name: string) {
  return getUrl(`/queue/${name}`);
}

export function createQueue(name: string, opts?: AxiosRequestConfig) {
  return Axios.put(queueUrl(name), null, {
    ...opts,
    params: {
      persistent: false,
      ...(opts?.params || {}),
    },
  });
}
