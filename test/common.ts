import Axios, { AxiosRequestConfig } from "axios";
import { getUrl } from "./util";
import yxc from "@dotvirus/yxc";
import { ObjectHandler } from "@dotvirus/yxc/dist/handlers/object";

enum MessageState {
  Pending = "Pending",
  Requeued = "Requeued",
}

export const Message = (item: ObjectHandler = yxc.object().arbitrary()) =>
  yxc.object({
    id: yxc.string(),
    queued_at: yxc.number(),
    item,
    state: yxc.string().enum(Object.values(MessageState)),
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
