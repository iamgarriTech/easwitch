import { EaswError } from "./errors.js";

/** eas commands easw runs as the resolved account. Anything else needs `easw exec eas ...`. */
export const EAS_COMMANDS = ["build", "update", "submit", "whoami"];

export type Route = { kind: "easw" } | { kind: "run"; command: string; args: string[] };

export function route(argv: string[]): Route {
  const [sub, ...rest] = argv;
  // Forward verbatim so flags like --platform or --help reach eas untouched.
  if (EAS_COMMANDS.includes(sub)) return { kind: "run", command: "eas", args: argv };
  if (sub === "exec") {
    const args = rest[0] === "--" ? rest.slice(1) : rest;
    if (!args.length) throw new EaswError("Usage: easw exec <command> [args...]");
    return { kind: "run", command: args[0], args: args.slice(1) };
  }
  return { kind: "easw" };
}
