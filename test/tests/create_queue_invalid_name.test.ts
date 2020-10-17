import ava, { before, after } from "ava";
import Axios from "axios";
import { spawnCorinth, NO_FAIL, persistenceTeardown } from "../util";
import { createQueue } from "../common";
import yxc, { createExecutableSchema } from "@dotvirus/yxc";
import axiosRetry from "axios-retry";

axiosRetry(Axios, { retries: 3 });

before(persistenceTeardown);
after(persistenceTeardown);

spawnCorinth();

ava.serial("Create queue with empty name", async (t) => {
  const res = await createQueue("", NO_FAIL());
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(400),
          data: yxc.object({
            error: yxc.boolean().true(),
            message: yxc.string().equals("Invalid queue name"),
            status: yxc.number().equals(400),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});

ava.serial("Create queue with too long name", async (t) => {
  const res = await createQueue(
    "asdmoiasjdfoisajdfoijsadofsdokfaposdkfpoaskdfpasdasdokasodpfasdasdasdasda",
    NO_FAIL()
  );
  t.assert(
    createExecutableSchema(
      yxc
        .object({
          status: yxc.number().equals(400),
          data: yxc.object({
            error: yxc.boolean().true(),
            message: yxc.string().equals("Invalid queue name"),
            status: yxc.number().equals(400),
          }),
        })
        .arbitrary()
    )(res).ok
  );
});
