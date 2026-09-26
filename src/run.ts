import path from "node:path";
import spawn from "cross-spawn";
import pc from "picocolors";
import { loadConfig } from "./config.js";
import { resolveEas } from "./eas.js";
import { EaswError } from "./errors.js";
import { resolveAccount } from "./resolve.js";
import { getToken } from "./tokens.js";

function notFound(command: string): EaswError {
  return new EaswError(`Command not found: ${command}`);
}

/**
 * Run `command` with the resolved account's token injected as EXPO_TOKEN for
 * that child process only. Resolves with the child's exit code.
 */
export async function runWithAccount(command: string, args: string[], cwd = process.cwd()): Promise<number> {
  const cfg = loadConfig();
  const account = resolveAccount(cfg, cwd);
  const token = await getToken(account.name);
  if (!token) {
    throw new EaswError(
      `No token stored for "${account.name}"`,
      `Re-add it with \`easw add ${account.name} --force\`.`,
    );
  }

  const eas = command === "eas" ? resolveEas() : undefined;
  const via = [
    account.source === "project" ? `linked in ${path.relative(cwd, account.linkFile!) || account.linkFile}` : "current",
    eas?.bundled && `bundled eas-cli ${eas.bundled}`,
  ]
    .filter(Boolean)
    .join(", ");
  // stderr, so piping the command's stdout stays clean.
  process.stderr.write(pc.dim(`› easw: using account "${account.name}" (${via})\n`));
  if (process.env.EXPO_TOKEN && process.env.EXPO_TOKEN !== token) {
    process.stderr.write(pc.yellow(`› easw: overriding EXPO_TOKEN from your shell for this command\n`));
  }

  return new Promise((resolve, reject) => {
    const child = spawn(eas ? eas.command : command, eas ? [...eas.prefix, ...args] : args, {
      cwd,
      stdio: "inherit",
      env: { ...process.env, EXPO_TOKEN: token },
    });

    // The child shares our terminal and receives Ctrl+C itself; don't die before it does.
    const ignore = () => {};
    process.on("SIGINT", ignore);
    process.on("SIGTERM", ignore);
    const cleanup = () => {
      process.off("SIGINT", ignore);
      process.off("SIGTERM", ignore);
    };

    child.on("error", (err: NodeJS.ErrnoException) => {
      cleanup();
      reject(err.code === "ENOENT" ? notFound(command) : err);
    });
    child.on("close", (code, signal) => {
      cleanup();
      resolve(code ?? (signal ? 128 + (signalNumber(signal) ?? 1) : 1));
    });
  });
}

function signalNumber(signal: NodeJS.Signals): number | undefined {
  return (
    { SIGHUP: 1, SIGINT: 2, SIGQUIT: 3, SIGKILL: 9, SIGTERM: 15 } as Partial<Record<NodeJS.Signals, number>>
  )[signal];
}

/** Resolve the Expo username for a token by running `eas whoami` with it. */
export function whoamiForToken(token: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const eas = resolveEas();
    const child = spawn(eas.command, [...eas.prefix, "whoami"], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, EXPO_TOKEN: token, FORCE_COLOR: "0" },
    });
    let out = "";
    let err = "";
    child.stdout!.on("data", (d) => (out += d));
    child.stderr!.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => {
      const username = out.split(/\r?\n/).map((l) => l.trim()).find(Boolean);
      if (code === 0 && username) return resolve(username);
      const reason =
        `${out}\n${err}`.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? `eas whoami exited with code ${code}`;
      reject(new EaswError(`Token was rejected by Expo: ${reason}`, "Pass --no-verify to skip this check."));
    });
  });
}
