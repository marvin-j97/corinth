import { persistenceTeardown, spawnCorinth } from "./test/util";

export default {
  hooks: {
    before: async () => {
      persistenceTeardown();
      await spawnCorinth();
    },
  },
};
