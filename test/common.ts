import Axios, { AxiosRequestConfig } from "axios";
import { getUrl } from "./util";

export function queueUrl(name: string) {
  return getUrl(`/queue/${name}`);
}

export function createQueue(name: string, opts?: AxiosRequestConfig) {
  return Axios.put(queueUrl(name), opts);
}
