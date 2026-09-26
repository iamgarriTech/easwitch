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
delete env.EASWITCH_HOOK; // an active hook in the developer's terminal would change `easw current`
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
  // CI has no global eas, so this exercises the bundled eas-cli.
  assert.match(ok(["exec", "eas", "--version"]), /eas-cli\//);
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
  const state = JSON.parse(ok(["current", "--json"], { cwd: nested }));
  assert.deepEqual(state.resolved, { name: b, source: "project" });
  const list = JSON.parse(ok(["list", "--json"], { cwd: nested }));
  assert.deepEqual(list.accounts.map((x) => [x.name, x.current, x.linked]), [[a, true, false], [b, false, true]]);
  assert.equal(ok(printToken), "token-a", "outside the project, current account applies");

  assert.equal(easw(["use"]).status, 1, "use without a name needs a terminal for the picker");
  // Shell hook: plain `eas` uses the linked account only inside the linked project.
  assert.match(ok(["shell-init", "bash"]), /eas\(\) \{ command easw eas "\$@"; \}/);
  const hooked = easw(["eas", "--version"], { cwd: nested });
  assert.equal(hooked.status, 0);
  assert.match(hooked.stderr, new RegExp(`using account "${b}"`));
  const plain = easw(["eas", "--version"]);
  assert.equal(plain.status, 0);
  assert.doesNotMatch(plain.stderr, /using account/);
  assert.match(plain.stdout, /eas-cli\//);
  // Hooks installed before 0.9 call the legacy name.
  assert.equal(easw(["__shell-eas", "--version"]).status, 0);

  // easw env: sets EXPO_TOKEN to the linked account; stdout is a pipe here, so it prints.
  assert.equal(ok(["env"], { cwd: nested }).trim(), "export EXPO_TOKEN='token-b'");
  assert.equal(ok(["env", "--unset"]).trim(), "unset EXPO_TOKEN");

  // easw current warns when plain `eas` won't follow the link, and not when the hook is active.
  assert.match(ok(["current"], { cwd: nested }), /Plain `eas` here still uses your normal Expo login/);
  env.EASWITCH_HOOK = "1";
  assert.match(ok(["current"], { cwd: nested }), /shell hook is active/);
  delete env.EASWITCH_HOOK;

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
