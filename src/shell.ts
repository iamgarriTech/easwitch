import path from "node:path";
import { EaswError } from "./errors.js";
import { findProjectLink } from "./project.js";
import { SHELL_EAS, isLoginCommand } from "./route.js";
import { runEasPlain, runWithAccount } from "./run.js";

export const SHELLS = ["zsh", "bash", "fish", "powershell"] as const;
export type Shell = (typeof SHELLS)[number];

const COMMENT = "EASwitch shell hook: inside projects linked with `easw link`, plain `eas` runs as the linked account.";

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
