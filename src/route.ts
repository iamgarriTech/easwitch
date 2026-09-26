import { EaswError } from "./errors.js";

/** Subcommands easw handles itself (keep in sync with buildProgram). Anything else goes to eas. */
export const EASW_COMMANDS = [
  "add", "list", "ls", "use", "current", "remove", "rm", "link", "unlink", "shell-init", "hook", "unhook", "env", "help",
];

/** eas commands that write the normal Expo session, which EASwitch must never touch. */
const BLOCKED = ["login", "logout", "account:login", "account:logout"];

export const isLoginCommand = (sub: string | undefined) => sub !== undefined && BLOCKED.includes(sub);

/**
 * `easw eas <args>` runs eas the way the shell hook does. `__shell-eas` is the name hooks
 * installed before 0.9 call; it stays as a hidden alias so they keep working.
 */
export const SHELL_EAS = "__shell-eas";

export type Route =
  | { kind: "easw" }
  | { kind: "run"; command: string; args: string[] }
  | { kind: "shell-eas"; args: string[] };

export function route(argv: string[]): Route {
  const [sub, ...rest] = argv;
  if (sub === undefined || sub.startsWith("-") || EASW_COMMANDS.includes(sub)) return { kind: "easw" };
  if (sub === "eas" || sub === SHELL_EAS) return { kind: "shell-eas", args: rest };
  if (sub === "exec") {
    const args = rest[0] === "--" ? rest.slice(1) : rest;
    if (!args.length) throw new EaswError("Usage: easw exec <command> [args...]");
    return { kind: "run", command: args[0], args: args.slice(1) };
  }
  if (isLoginCommand(sub)) {
    throw new EaswError(
      `\`easw ${sub}\` isn't supported: it would change your normal Expo login`,
      "Add accounts with `easw add <name>`. For your normal session, use `eas login` directly.",
    );
  }
  // Forward verbatim so flags like --platform or --help reach eas untouched.
  return { kind: "run", command: "eas", args: argv };
}
