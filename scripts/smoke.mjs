// End-to-end check of the built CLI against the real OS credential store.
// Uses a throwaway config dir and a unique profile name, and cleans up after itself.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "easw-smoke-"));
const env = { ...process.env, EASWITCH_CONFIG_DIR: path.join(tmp, "config"), NO_COLOR: "1" };
delete env.EXPO_TOKEN;
const id = `smoke-${process.pid}-${Date.now()}`;
const [a, b] = [`${id}-a`, `${id}-b`];

function easw(args, { cwd = tmp, input } = {}) {
  const r = spawnSync(process.execPath, [cli, ...args], { cwd, env, input, encoding: "utf8" });
  console.log(`$ easw ${args.join(" ")}  → exit ${r.status}`);
  return r;
}
function ok(args, opts) {
  const r = easw(args, opts);
  assert.equal(r.status, 0, `easw ${args.join(" ")} failed:\n${r.stdout}\n${r.stderr}`);
  return r.stdout;
}
const printToken = ["exec", "node", "-e", "process.stdout.write(process.env.EXPO_TOKEN ?? '')"];

try {
  ok(["add", a, "--token", "token-a", "--no-verify"]);
  ok(["add", b, "--no-verify"], { input: "token-b\n" }); // token from stdin
  assert.match(ok(["list"]), new RegExp(`● ${a}`));

  assert.equal(ok(printToken), "token-a");
  // A .cmd shim on Windows; exercises cross-spawn.
  ok(["exec", "npm", "--version"]);
  assert.equal(easw(["exec", "node", "-e", "process.exit(7)"]).status, 7);
  assert.equal(easw(["exec", "definitely-not-a-command"]).status, 1);
  const login = easw(["login"]);
  assert.equal(login.status, 1);
  assert.match(login.stderr, /normal Expo login/);

  const project = path.join(tmp, "project");
  const nested = path.join(project, "src", "screens");
  fs.mkdirSync(nested, { recursive: true });
  fs.writeFileSync(path.join(project, "app.json"), "{}");
  fs.writeFileSync(path.join(project, ".gitignore"), "node_modules\n");
  ok(["link", b], { cwd: nested });
  assert.ok(fs.existsSync(path.join(project, ".easwitch.json")), "link should write at project root");
  assert.match(fs.readFileSync(path.join(project, ".gitignore"), "utf8"), /^\.easwitch\.json$/m);
  assert.equal(ok(printToken, { cwd: nested }), "token-b");
  assert.equal(ok(printToken), "token-a", "outside the project, current account applies");

  ok(["use", b]);
  assert.match(ok(["current"]), new RegExp(`Current EASwitch account: ${b}`));
  ok(["unlink"], { cwd: nested });

  ok(["remove", b]);
  assert.equal(easw(["use", b]).status, 1);
  console.log("\nSmoke test passed");
} finally {
  for (const name of [a, b]) easw(["remove", name]);
  fs.rmSync(tmp, { recursive: true, force: true });
}
