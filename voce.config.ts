import { ChildProcess } from "child_process";
import { persistenceTeardown, spawnCorinth } from "./test/util";

let process: ChildProcess;

export default {
  hooks: {
    before: async () => {
      persistenceTeardown();
      process = await spawnCorinth();
    },
    after: async () => {
      console.error("Killing corinth exe");
      process.kill();
    },
  },
};
