import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { Command } from "commander";
import { password } from "@inquirer/prompts";
import pc from "picocolors";
import { assertValidName, loadConfig, saveConfig, type GlobalConfig } from "./config.js";
import { EaswError } from "./errors.js";
import { findProjectLink, findProjectRoot, writeProjectLink } from "./project.js";
import { runWithAccount, whoamiForToken } from "./run.js";
import { deleteToken, setToken } from "./tokens.js";

const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

/** Subcommands forwarded to `eas <sub> ...args` with every argument passed through untouched. */
const EAS_PASSTHROUGH = ["build", "update", "submit", "whoami"] as const;

const ok = (msg: string) => console.log(`${pc.green("✓")} ${msg}`);

function requireAccount(cfg: GlobalConfig, name: string): void {
  if (!cfg.accounts[name]) {
    throw new EaswError(`No account named "${name}"`, "See your accounts with `easw list`.");
  }
}

async function readStdin(): Promise<string> {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.trim();
}

function buildProgram(): Command {
  const program = new Command()
    .name("easw")
    .description("Switch between multiple Expo/EAS accounts without touching your normal Expo login.")
    .version(version);

  program
    .command("add")
    .description("add an account profile (prompts for an Expo access token)")
    .argument("<name>", "profile name, e.g. work")
    .option("--token <token>", "access token (prefer the prompt or stdin: flags end up in shell history)")
    .option("--no-verify", "don't check the token against Expo")
    .option("-f, --force", "overwrite an existing profile")
    .addHelpText("after", "\nCreate a token at https://expo.dev/settings/access-tokens")
    .action(async (name: string, opts: { token?: string; verify: boolean; force?: boolean }) => {
      assertValidName(name);
      const cfg = loadConfig();
      if (cfg.accounts[name] && !opts.force) {
        throw new EaswError(`Account "${name}" already exists`, "Use --force to replace its token.");
      }

      let token = opts.token;
      if (!token && !process.stdin.isTTY) token = await readStdin();
      if (!token) {
        console.log(pc.dim("Create a token at https://expo.dev/settings/access-tokens"));
        console.log(`Profile name: ${name}`);
        token = await password({ message: "Expo access token:", mask: "*" });
      }
      token = token.trim();
      if (!token) throw new EaswError("No token provided");

      const username = opts.verify ? await whoamiForToken(token) : undefined;
      await setToken(name, token);
      cfg.accounts[name] = { username, addedAt: new Date().toISOString() };
      cfg.current ??= name;
      saveConfig(cfg);

      ok(`Account "${name}" added${username ? pc.dim(` (Expo user: ${username})`) : ""}`);
      if (cfg.current === name && Object.keys(cfg.accounts).length === 1) {
        console.log(pc.dim(`  It's your only account, so it's now the current one.`));
      }
    });

  program
    .command("list")
    .alias("ls")
    .description("list account profiles")
    .action(() => {
      const cfg = loadConfig();
      const names = Object.keys(cfg.accounts).sort();
      if (!names.length) {
        console.log("No accounts yet. Add one with `easw add <name>`.");
        return;
      }
      const link = findProjectLink(process.cwd());
      const width = Math.max(...names.map((n) => n.length));
      console.log(pc.bold("EASwitch Accounts\n"));
      for (const name of names) {
        const current = name === cfg.current;
        const bullet = current ? pc.green("●") : pc.dim("○");
        const label = current ? pc.green(name.padEnd(width)) : name.padEnd(width);
        const user = cfg.accounts[name].username ? pc.dim(`  ${cfg.accounts[name].username}`) : "";
        const linked = link?.account === name ? pc.cyan("  (linked to this project)") : "";
        console.log(`${bullet} ${label}${user}${linked}`);
      }
    });

  program
    .command("use")
    .description("set the current account (doesn't affect your normal `eas` login)")
    .argument("<name>")
    .action((name: string) => {
      const cfg = loadConfig();
      requireAccount(cfg, name);
      cfg.current = name;
      saveConfig(cfg);
      ok(`Using EAS account "${name}"`);
      const link = findProjectLink(process.cwd());
      if (link && link.account !== name) {
        console.log(pc.yellow(`  Note: this project is linked to "${link.account}", which takes precedence here.`));
      }
    });

  program
    .command("current")
    .description("show the current account")
    .action(() => {
      const cfg = loadConfig();
      console.log(`Current EASwitch account: ${cfg.current ?? pc.dim("(none)")}`);
      const link = findProjectLink(process.cwd());
      if (link) {
        console.log(`This project is linked to: ${pc.cyan(link.account)} ${pc.dim(`(${link.file})`)}`);
      }
    });

  program
    .command("remove")
    .alias("rm")
    .description("remove an account profile and its stored token")
    .argument("<name>")
    .action(async (name: string) => {
      const cfg = loadConfig();
      requireAccount(cfg, name);
      await deleteToken(name);
      delete cfg.accounts[name];
      if (cfg.current === name) cfg.current = null;
      saveConfig(cfg);
      ok(`Account "${name}" removed`);
      if (cfg.current === null && Object.keys(cfg.accounts).length) {
        console.log(pc.dim("  No current account now. Pick one with `easw use <name>`."));
      }
    });

  program
    .command("link")
    .description("link the current project to an account")
    .argument("<name>")
    .action((name: string) => {
      const cfg = loadConfig();
      requireAccount(cfg, name);
      const file = writeProjectLink(findProjectRoot(process.cwd()), name);
      ok(`Project linked to "${name}" ${pc.dim(`(${path.relative(process.cwd(), file) || file})`)}`);
    });

  program
    .command("unlink")
    .description("remove the current project's account link")
    .action(() => {
      const link = findProjectLink(process.cwd());
      if (!link) {
        console.log("This project isn't linked to an EASwitch account.");
        return;
      }
      fs.unlinkSync(link.file);
      ok("Project account removed");
    });

  // Registered for --help only; main() handles these before commander parses.
  for (const sub of EAS_PASSTHROUGH) {
    program.command(sub).description(`run \`eas ${sub}\` as the resolved account`);
  }
  program.command("exec").argument("<command...>").description("run any command as the resolved account");

  return program;
}

async function main(argv: string[]): Promise<number> {
  const [sub, ...rest] = argv;
  // Hand these straight to the child so flags like --platform or --help reach eas untouched.
  if ((EAS_PASSTHROUGH as readonly string[]).includes(sub)) {
    return runWithAccount("eas", [sub, ...rest]);
  }
  if (sub === "exec") {
    const args = rest[0] === "--" ? rest.slice(1) : rest;
    if (!args.length) throw new EaswError("Usage: easw exec <command> [args...]");
    return runWithAccount(args[0], args.slice(1));
  }
  await buildProgram().parseAsync(argv, { from: "user" });
  return 0;
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (err: unknown) => {
    if (err instanceof EaswError) {
      console.error(`${pc.red("✖")} ${err.message}`);
      if (err.hint) console.error(pc.dim(`  ${err.hint}`));
    } else if (err instanceof Error && err.name === "ExitPromptError") {
      // Ctrl+C at a prompt.
      process.exitCode = 130;
      return;
    } else {
      console.error(err);
    }
    process.exitCode = 1;
  },
);
