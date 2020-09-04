import Axios, { AxiosRequestConfig } from "axios";
import { getUrl } from "./util";
import yxc from "@dotvirus/yxc";
import { ObjectHandler } from "@dotvirus/yxc/dist/handlers/object";

export const Message = (item: ObjectHandler = yxc.object().arbitrary()) =>
  yxc.object({
    id: yxc.string(),
    queued_at: yxc.number(),
    item,
  });

export function queueUrl(name: string) {
  return getUrl(`/queue/${name}`);
}

export function createQueue(name: string, opts?: AxiosRequestConfig) {
  return Axios.put(queueUrl(name), null, opts);
}
