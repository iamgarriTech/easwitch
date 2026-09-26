import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { Command } from "commander";
import { password } from "@inquirer/prompts";
import pc from "picocolors";
import { assertValidName, loadConfig, saveConfig, type GlobalConfig } from "./config.js";
import { EaswError } from "./errors.js";
import { PROJECT_FILE, ensureGitignored, findProjectLink, findProjectRoot, writeProjectLink } from "./project.js";
import { resolveAccount } from "./resolve.js";
import { route } from "./route.js";
import { TOKEN_URL, runWithAccount, whoamiForToken } from "./run.js";
import { deleteToken, setToken } from "./tokens.js";

const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

const ok = (msg: string) => console.log(`${pc.green("✓")} ${msg}`);
const printJson = (value: unknown) => console.log(JSON.stringify(value, null, 2));

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

/** Best effort: open `url` in the default browser. */
function openInBrowser(url: string): void {
  const [cmd, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  const child = spawn(cmd, args, { stdio: "ignore", detached: true });
  child.on("error", () => {});
  child.unref();
}

async function promptForToken(name: string): Promise<string> {
  console.log(`Adding account ${pc.bold(`"${name}"`)}\n`);
  console.log("Create an access token for this Expo account at:");
  console.log(`  ${pc.cyan(pc.underline(TOKEN_URL))}`);
  console.log(pc.dim("  Sign in to the right Expo account in your browser first, so the token belongs to it."));
  console.log(pc.dim("  Press Enter without a token to open the page.\n"));

  const ask = () => password({ message: "Expo access token:", mask: "*" });
  let token = (await ask()).trim();
  if (!token) {
    openInBrowser(TOKEN_URL);
    console.log(pc.dim(`  Opening ${TOKEN_URL} in your browser...\n`));
    token = (await ask()).trim();
  }
  return token;
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
    .addHelpText("after", `\nCreate a token at ${TOKEN_URL}`)
    .action(async (name: string, opts: { token?: string; verify: boolean; force?: boolean }) => {
      assertValidName(name);
      const cfg = loadConfig();
      if (cfg.accounts[name] && !opts.force) {
        throw new EaswError(`Account "${name}" already exists`, "Use --force to replace its token.");
      }

      let token = opts.token?.trim();
      if (!token && !process.stdin.isTTY) {
        token = await readStdin();
        // No terminal to prompt in (a script, CI or an AI agent), so fail clearly instead.
        if (!token) {
          throw new EaswError("No token provided", `Pass --token <token> or pipe it via stdin. Create one at ${TOKEN_URL}`);
        }
      }
      if (!token) token = await promptForToken(name);
      if (!token) throw new EaswError("No token provided", `Create one at ${TOKEN_URL}`);

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
    .option("--json", "print machine-readable JSON")
    .action((opts: { json?: boolean }) => {
      const cfg = loadConfig();
      const names = Object.keys(cfg.accounts).sort();
      if (opts.json) {
        const link = findProjectLink(process.cwd());
        printJson({
          current: cfg.current,
          accounts: names.map((name) => ({
            name,
            username: cfg.accounts[name].username ?? null,
            current: name === cfg.current,
            linked: link?.account === name,
          })),
        });
        return;
      }
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
    .option("--json", "print machine-readable JSON, including the account easw would use here")
    .action((opts: { json?: boolean }) => {
      const cfg = loadConfig();
      if (opts.json) {
        const cwd = process.cwd();
        const link = findProjectLink(cwd);
        let resolved: { name: string; source: string } | null = null;
        let error: string | null = null;
        try {
          const r = resolveAccount(cfg, cwd);
          resolved = { name: r.name, source: r.source };
        } catch (err) {
          if (!(err instanceof EaswError)) throw err;
          error = err.message;
        }
        printJson({ current: cfg.current, project: link, resolved, error });
        return;
      }
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
      const root = findProjectRoot(process.cwd());
      const file = writeProjectLink(root, name);
      ok(`Project linked to "${name}" ${pc.dim(`(${path.relative(process.cwd(), file) || file})`)}`);
      if (ensureGitignored(root)) {
        console.log(pc.dim(`  Added ${PROJECT_FILE} to .gitignore, since account names are personal.`));
      }
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

  // Registered for --help only; main() routes exec before commander parses.
  program.command("exec").argument("<command...>").description("run any command as the selected account");
  program.addHelpText(
    "after",
    "\nAny other eas command runs as the selected account, e.g. `easw build` or `easw env:list`.",
  );

  return program;
}

async function main(argv: string[]): Promise<number> {
  const r = route(argv);
  if (r.kind === "run") return runWithAccount(r.command, r.args);
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
