import { spawnCorinth } from "./test/util";

export default {
  hooks: {
    before: async () => {
      await spawnCorinth();
    },
  },
};
