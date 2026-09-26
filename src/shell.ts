import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { configDir } from "./config.js";
import { EaswError } from "./errors.js";
import { findProjectLink } from "./project.js";
import { SHELL_EAS, isLoginCommand } from "./route.js";
import { runEasPlain, runWithAccount } from "./run.js";

export const SHELLS = ["zsh", "bash", "fish", "powershell", "cmd"] as const;
export type Shell = (typeof SHELLS)[number];

const COMMENT = "EASwitch shell hook: inside projects linked with `easw link`, plain `eas` runs as the linked account.";

/** Shells `easw hook` sets up when none is named: on Windows both PowerShell and Command Prompt. */
export function defaultHookShells(): Shell[] {
  return process.platform === "win32" ? ["powershell", "cmd"] : [detectShell()];
}

export function detectShell(): Shell {
  if (process.platform === "win32") return "powershell";
  const name = path.basename(process.env.SHELL ?? "");
  if ((SHELLS as readonly string[]).includes(name)) return name as Shell;
  throw new EaswError("Couldn't detect your shell", `Pass one of: ${SHELLS.join(", ")}. For example: easw shell-init zsh`);
}

/** Shell code that wraps `eas` so it goes through `easw __shell-eas`. */
export function shellInit(shell: Shell): string {
  switch (shell) {
    case "zsh":
    case "bash":
      return `# ${COMMENT}\neas() { command easw ${SHELL_EAS} "$@"; }\n`;
    case "fish":
      return `# ${COMMENT}\nfunction eas --description 'eas, as the linked EASwitch account in linked projects'\n    command easw ${SHELL_EAS} $argv\nend\n`;
    case "powershell":
      return `# ${COMMENT}\nfunction eas { easw ${SHELL_EAS} @args }\n`;
    case "cmd":
      // cmd has no functions; a doskey macro is its equivalent for interactive sessions.
      return `@rem ${COMMENT}\n@doskey eas=easw ${SHELL_EAS} $*\n`;
  }
}

/**
 * What a plain `eas` does once the hook is installed: the linked account inside a
 * linked project, otherwise the user's normal eas. Logging in or out always goes
 * to the normal session.
 */
export function runShellEas(args: string[], cwd = process.cwd()): Promise<number> {
  if (findProjectLink(cwd) && !isLoginCommand(args[0])) return runWithAccount("eas", args, cwd);
  return runEasPlain(args, cwd);
}

/** Marks the lines `easw hook` adds, so `easw unhook` can find and remove them. */
const HOOK_MARKER = "# Added by EASwitch (easw hook). Remove with: easw unhook";

/** The line `easw hook` adds to the shell's startup file. */
function hookLine(shell: Shell): string {
  switch (shell) {
    case "zsh":
    case "bash":
      return `eval "$(easw shell-init ${shell})"`;
    case "fish":
      return "easw shell-init fish | source";
    case "powershell":
      return "easw shell-init powershell | Out-String | Invoke-Expression";
    case "cmd":
      return `doskey eas=easw ${SHELL_EAS} $*`;
  }
}

function powershellProfile(): string {
  for (const exe of ["pwsh", "powershell"]) {
    const r = spawnSync(exe, ["-NoProfile", "-Command", "$PROFILE.CurrentUserCurrentHost"], { encoding: "utf8" });
    const file = r.status === 0 ? r.stdout.trim() : "";
    if (file) return file;
  }
  throw new EaswError(
    "Couldn't find your PowerShell profile",
    `Add this line to it yourself: ${hookLine("powershell")}`,
  );
}

/** The startup file `easw hook` edits for each shell. */
export function rcFile(shell: Shell): string {
  const home = os.homedir();
  switch (shell) {
    case "zsh":
      return path.join(process.env.ZDOTDIR ?? home, ".zshrc");
    case "bash":
      // macOS terminals start login shells, which read .bash_profile rather than .bashrc.
      return path.join(home, process.platform === "darwin" ? ".bash_profile" : ".bashrc");
    case "fish":
      return path.join(process.env.XDG_CONFIG_HOME ?? path.join(home, ".config"), "fish", "config.fish");
    case "powershell":
      return powershellProfile();
    case "cmd":
      // Loaded by cmd's AutoRun setting; see installCmdHook.
      return path.join(configDir(), "cmd-hook.cmd");
  }
}

/** Add the hook to `file`. Returns false when it was already there. */
export function installHook(shell: Shell, file: string): boolean {
  const contents = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  // Also counts a hook the user added by hand from `easw shell-init`.
  if (contents.includes(HOOK_MARKER) || contents.includes("easw shell-init")) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sep = contents === "" ? "" : contents.endsWith("\n") ? "\n" : "\n\n";
  fs.appendFileSync(file, `${sep}${HOOK_MARKER}\n${hookLine(shell)}\n`);
  return true;
}

/** Remove the hook from `file`. Returns false when it wasn't there. */
export function uninstallHook(file: string): boolean {
  if (!fs.existsSync(file)) return false;
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const i = lines.indexOf(HOOK_MARKER);
  if (i === -1) return false;
  // The marker, the hook line after it, and the blank line `installHook` put before it.
  const start = i > 0 && lines[i - 1] === "" ? i - 1 : i;
  lines.splice(start, i + 2 - start);
  fs.writeFileSync(file, lines.join("\n"));
  return true;
}

// Command Prompt: cmd runs the registry's AutoRun command at startup. easw adds a
// call to its own hook file there, next to any AutoRun command already set.
const AUTORUN_KEY = "HKCU\\Software\\Microsoft\\Command Processor";

function readAutoRun(): string {
  const r = spawnSync("reg", ["query", AUTORUN_KEY, "/v", "AutoRun"], { encoding: "utf8" });
  if (r.status !== 0) return "";
  return r.stdout.match(/AutoRun\s+REG_(?:EXPAND_)?SZ\s+(.*)/)?.[1]?.trim() ?? "";
}

function writeAutoRun(value: string): void {
  const args = value
    ? ["add", AUTORUN_KEY, "/v", "AutoRun", "/t", "REG_SZ", "/d", value, "/f"]
    : ["delete", AUTORUN_KEY, "/v", "AutoRun", "/f"];
  const r = spawnSync("reg", args, { encoding: "utf8" });
  if (r.status !== 0) throw new EaswError(`Couldn't update cmd's AutoRun setting: ${(r.stderr || r.stdout).trim()}`);
}

/** Add the doskey hook to Command Prompt. Returns false when it was already there. */
export function installCmdHook(): boolean {
  const file = rcFile("cmd");
  const call = `"${file}"`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `@rem ${HOOK_MARKER}\r\n@${hookLine("cmd")}\r\n`);
  const current = readAutoRun();
  if (current.includes(call)) return false;
  writeAutoRun(current ? `${current} & ${call}` : call);
  return true;
}

/** Remove the doskey hook from Command Prompt. Returns false when it wasn't there. */
export function uninstallCmdHook(): boolean {
  const file = rcFile("cmd");
  const call = `"${file}"`;
  const current = readAutoRun();
  fs.rmSync(file, { force: true });
  if (!current.includes(call)) return false;
  const rest = current
    .split("&")
    .map((part) => part.trim())
    .filter((part) => part && part !== call)
    .join(" & ");
  writeAutoRun(rest);
  return true;
}
