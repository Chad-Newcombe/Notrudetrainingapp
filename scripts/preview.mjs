import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const host = "127.0.0.1";
const port = 4310;
const origin = `http://${host}:${port}`;
const next = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));

function checkPort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(port, host, () => probe.close(resolve));
  });
}

function previewSecret() {
  const path = ".notrude/preview-auth-secret";
  mkdirSync(".notrude", { recursive: true, mode: 0o700 });
  try {
    writeFileSync(path, randomBytes(32).toString("hex"), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  return readFileSync(path, "utf8");
}

try {
  await checkPort();
} catch (error) {
  if (error.code !== "EADDRINUSE") throw error;
  console.error(`Port ${port} is in use. Stop the existing preview or other process on ${origin}, then run npm run preview again.`);
  process.exit(1);
}

const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
const changes = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" });
const build = changes ? `${commit} + local edits` : commit;
const env = {
  ...process.env,
  NOTRUDE_PREVIEW_BUILD: build,
  BETTER_AUTH_URL: origin,
  BETTER_AUTH_SECRET: previewSecret(),
  NOTRUDE_DB_PATH: ".notrude/preview.sqlite",
};

function runNext(args) {
  const result = spawnSync(process.execPath, [next, ...args], { env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.signal === "SIGINT") process.exit(130);
  if (result.signal === "SIGTERM") process.exit(143);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Building Notrude Preview · ${build}`);
runNext(["build"]);
console.log(`Open ${origin} after Next.js reports Ready.`);
runNext(["start", "--hostname", host, "--port", String(port)]);
