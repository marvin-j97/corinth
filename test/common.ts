import Axios, { AxiosRequestConfig } from "axios";
import { getUrl } from "./util";
import yxc from "@dotvirus/yxc";
import { ObjectHandler } from "@dotvirus/yxc/dist/handlers/object";

export enum MessageState {
  Pending = "Pending",
  Requeued = "Requeued",
}

export const Message = (
  item: ObjectHandler = yxc.object().arbitrary(),
  num_requeues = yxc.number().integer().min(0),
  state = yxc.string().enum(Object.values(MessageState))
) =>
  yxc.object({
    id: yxc.string(),
    queued_at: yxc.number().integer().positive(),
    updated_at: yxc.number().integer().positive(),
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
