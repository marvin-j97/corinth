import execa from "execa";
import { platform } from "os";

export const PORT = +(process.env.CORINTH_PORT || 6767);
export const IP = `http://localhost:${PORT}`;
export const getUrl = (route: string) => IP + route;

export function spawnCorinth() {
  const exeName = "corinth" + (platform() === "win32" ? ".exe" : "");
  const path = `../target/debug/${exeName}`;
  console.error(`Spawning ${path} with port ${PORT}`);
  return execa(path, {
    stdout: process.stdout,
    env: {
      CORINTH_PORT: PORT.toString(),
    },
  });
}

export function unixToHammer(unix: number) {
  return unix * 1000;
}

export const NO_FAIL = () => ({
  validateStatus: () => true,
});
