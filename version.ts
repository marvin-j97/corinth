import * as toml from "toml";
import { readFileSync } from "fs";
import { getUrl, NO_FAIL, spawnCorinth } from "./test/util";
import Axios from "axios";

async function getCorinthVersion() {
  const res = await Axios.get(getUrl("/"), NO_FAIL());
  return res.data.result.info.version;
}

async function main() {
  const tomlContent: { package: { version?: string } } = toml.parse(
    readFileSync("Cargo.toml", "utf-8")
  );
  const tomlVersion = tomlContent.package.version;

  if (!tomlVersion) {
    process.exit(1);
  }

  const releaseTag = process.argv[2];

  const corinth = spawnCorinth();
  const corinthVersion = await getCorinthVersion();
  corinth.kill();

  if (releaseTag === corinthVersion && corinthVersion === tomlVersion) {
    process.exit(0);
  }
  console.log("Wrong version", {
    releaseTag,
    corinthVersion,
    tomlVersion,
  });
  process.exit(1);
}

main();
