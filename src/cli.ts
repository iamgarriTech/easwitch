import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import { createRequire } from "node:module";
import path from "node:path";
import { Command } from "commander";
import { confirm, password, select } from "@inquirer/prompts";
import pc from "picocolors";
import { assertValidName, loadConfig, saveConfig, type GlobalConfig } from "./config.js";
import { EaswError } from "./errors.js";
import { LOGIN_METHODS, loginForToken, type LoginMethod } from "./login.js";
import { PROJECT_FILE, ensureGitignored, findProjectLink, findProjectRoot, writeProjectLink } from "./project.js";
import { resolveAccount } from "./resolve.js";
import { route } from "./route.js";
import {
  SHELLS,
  HOOK_ENV,
  defaultHookShells,
  detectShell,
  envCode,
  envUsage,
  installCmdHook,
  installHook,
  isHookInstalled,
  rcFile,
  runShellEas,
  shellInit,
  uninstallCmdHook,
  uninstallHook,
  type Shell,
} from "./shell.js";
import { TOKEN_URL, runWithAccount, whoamiForToken } from "./run.js";
import { deleteToken, getToken, setToken } from "./tokens.js";

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

type AddMethod = LoginMethod | "token";

function chooseMethod(): Promise<AddMethod> {
  return select<AddMethod>({
    message: "How do you want to add this account?",
    choices: [
      { name: "Log in with Expo in your browser (recommended)", value: "browser" },
      { name: "Log in with email or username and password", value: "password" },
      { name: "Log in with SSO", value: "sso" },
      { name: "Paste an access token", value: "token" },
    ],
  });
}

async function promptForToken(): Promise<string> {
  console.log("\nCreate an access token for this Expo account at:");
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

/** Whether plain `eas` goes through EASwitch in this terminal (active) or will in new ones (installed). */
function hookStatus(): { installed: boolean; active: boolean } {
  const active = process.env[HOOK_ENV] === "1";
  return { active, installed: active || isHookInstalled() };
}

interface TokenCheck {
  valid: boolean;
  username?: string;
  error?: string;
}

/** Ask Expo whether an account's stored token still works. */
async function checkAccount(name: string): Promise<TokenCheck> {
  const token = await getToken(name);
  if (!token) return { valid: false, error: "no token stored" };
  try {
    return { valid: true, username: await whoamiForToken(token) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { valid: false, error: message.replace(/^Token was rejected by Expo: /, "") };
  }
}

function buildProgram(): Command {
  const program = new Command()
    .name("easw")
    .description("Switch between multiple Expo/EAS accounts without touching your normal Expo login.")
    .version(version);

  program
    .command("add")
    .description("add an account by logging in to Expo or pasting an access token")
    .argument("<name>", "profile name, e.g. work")
    .option("--login [method]", `log in to Expo to create the token: ${LOGIN_METHODS.join(", ")} (default: browser)`)
    .option("--token <token>", "access token (prefer the prompt or stdin: flags end up in shell history)")
    .option("--no-verify", "don't check the token against Expo")
    .option("-f, --force", "overwrite an existing profile")
    .addHelpText("after", `\nCreate a token at ${TOKEN_URL}`)
    .action(async (name: string, opts: { login?: string | true; token?: string; verify: boolean; force?: boolean }) => {
      assertValidName(name);
      const cfg = loadConfig();
      if (cfg.accounts[name] && !opts.force) {
        throw new EaswError(`Account "${name}" already exists`, "Use --force to replace its token.");
      }

      if (opts.login && opts.token) throw new EaswError("Use either --login or --token, not both");
      const login = opts.login === true ? "browser" : opts.login;
      if (login && !LOGIN_METHODS.includes(login as LoginMethod)) {
        throw new EaswError(`Unknown login method "${login}"`, `Use one of: ${LOGIN_METHODS.join(", ")}.`);
      }

      let token = opts.token?.trim();
      let username: string | undefined;
      let source: "login" | undefined;
      if (!token && !login && !process.stdin.isTTY) {
        token = await readStdin();
        // No terminal to prompt in (a script, CI or an AI agent), so fail clearly instead.
        if (!token) {
          throw new EaswError("No token provided", `Pass --token <token> or pipe it via stdin. Create one at ${TOKEN_URL}`);
        }
      }
      if (!token) {
        if (!process.stdin.isTTY) throw new EaswError("Logging in needs an interactive terminal", "Use --token instead.");
        if (!login) console.log(`Adding account ${pc.bold(`"${name}"`)}\n`);
        const method = (login as LoginMethod | undefined) ?? (await chooseMethod());
        if (method === "token") {
          token = await promptForToken();
        } else {
          console.log(`\nLog in as the Expo account you want to use for ${pc.bold(`"${name}"`)}.`);
          if (method !== "password") {
            console.log(pc.dim("  If your browser is signed in to a different Expo account, switch accounts there."));
          }
          console.log(pc.dim("  Your normal Expo login isn't affected.\n"));
          ({ token, username } = await loginForToken(method, `EASwitch: ${name} on ${os.hostname()}`));
          source = "login";
        }
      }
      if (!token) throw new EaswError("No token provided", `Create one at ${TOKEN_URL}`);

      if (!username && opts.verify) username = await whoamiForToken(token);
      await setToken(name, token);
      cfg.accounts[name] = { username, addedAt: new Date().toISOString(), ...(source && { source }) };
      cfg.current ??= name;
      saveConfig(cfg);

      ok(`Account "${name}" added${username ? pc.dim(` (Expo user: ${username})`) : ""}`);
      if (source === "login") {
        console.log(pc.dim(`  EASwitch created an access token for it on Expo; you can see or revoke it at ${TOKEN_URL}`));
      }
      if (cfg.current === name && Object.keys(cfg.accounts).length === 1) {
        console.log(pc.dim(`  It's your only account, so it's now the current one.`));
      }
    });

  program
    .command("list")
    .alias("ls")
    .description("list your accounts (--check tests their tokens with Expo)")
    .option("--check", "check each token with Expo and flag revoked or expired ones")
    .option("--json", "print machine-readable JSON")
    .action(async (opts: { check?: boolean; json?: boolean }) => {
      const cfg = loadConfig();
      const names = Object.keys(cfg.accounts).sort();
      const link = findProjectLink(process.cwd());

      let checks: Record<string, TokenCheck> = {};
      if (opts.check && names.length) {
        if (!opts.json) process.stderr.write(pc.dim("Checking tokens with Expo...\n"));
        const results = await Promise.all(names.map(checkAccount));
        checks = Object.fromEntries(names.map((name, i) => [name, results[i]]));
        // Fill in or correct the stored username while we're at it.
        let changed = false;
        for (const name of names) {
          const username = checks[name].username;
          if (username && cfg.accounts[name].username !== username) {
            cfg.accounts[name].username = username;
            changed = true;
          }
        }
        if (changed) saveConfig(cfg);
        // Let scripts detect a broken token from the exit code.
        if (results.some((r) => !r.valid)) process.exitCode = 1;
      }

      if (opts.json) {
        printJson({
          current: cfg.current,
          accounts: names.map((name) => ({
            name,
            username: cfg.accounts[name].username ?? null,
            current: name === cfg.current,
            linked: link?.account === name,
            ...(opts.check && { valid: checks[name].valid, error: checks[name].error ?? null }),
          })),
        });
        return;
      }
      if (!names.length) {
        console.log("No accounts yet. Add one with `easw add <name>`.");
        return;
      }
      const width = Math.max(...names.map((n) => n.length));
      console.log(pc.bold("EASwitch Accounts\n"));
      for (const name of names) {
        const current = name === cfg.current;
        const bullet = current ? pc.green("●") : pc.dim("○");
        const label = current ? pc.green(name.padEnd(width)) : name.padEnd(width);
        const user = cfg.accounts[name].username ? pc.dim(`  ${cfg.accounts[name].username}`) : "";
        const linked = link?.account === name ? pc.cyan("  (linked to this project)") : "";
        const check = checks[name];
        const status = !check ? "" : check.valid ? pc.green("  ✓ valid") : pc.red(`  ✗ ${check.error}`);
        console.log(`${bullet} ${label}${user}${linked}${status}`);
      }
      const invalid = names.filter((name) => checks[name] && !checks[name].valid);
      if (invalid.length) console.log(pc.dim(`\nReplace a token with \`easw add ${invalid[0]} --force\`.`));
    });

  program
    .command("use")
    .description("choose the current account; without a name, pick from a list")
    .argument("[name]")
    .action(async (name: string | undefined) => {
      const cfg = loadConfig();
      if (!name) {
        const names = Object.keys(cfg.accounts).sort();
        if (!names.length) throw new EaswError("No accounts yet", "Add one with `easw add <name>`.");
        if (!process.stdin.isTTY) throw new EaswError("Usage: easw use <name>");
        name = await select({
          message: "Which account do you want to use?",
          choices: names.map((n) => ({
            name: `${n}${cfg.accounts[n].username ? pc.dim(`  ${cfg.accounts[n].username}`) : ""}${n === cfg.current ? pc.dim("  (current)") : ""}`,
            value: n,
          })),
          default: cfg.current ?? undefined,
        });
      }
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
    .description("show the current account and the project's linked account")
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
        const hook = hookStatus();
        printJson({
          current: cfg.current,
          project: link,
          resolved,
          error,
          hook,
          plainEasFollowsLink: link ? hook.active : null,
        });
        return;
      }
      console.log(`Current EASwitch account: ${cfg.current ?? pc.dim("(none)")}`);
      const link = findProjectLink(process.cwd());
      if (!link) return;
      console.log(`This project is linked to: ${pc.cyan(link.account)} ${pc.dim(`(${link.file})`)}`);
      const hook = hookStatus();
      if (hook.active) {
        console.log(pc.dim("Plain `eas` here uses it too (the shell hook is active)."));
      } else if (hook.installed) {
        console.log(
          pc.yellow(
            `⚠ Plain \`eas\` here still uses your normal Expo login, not "${link.account}": the shell hook is set up, but this terminal hasn't loaded it. Open a new terminal.`,
          ),
        );
      } else {
        console.log(
          pc.yellow(
            `⚠ Plain \`eas\` here still uses your normal Expo login, not "${link.account}". Run \`easw hook\` so it follows the link, or use \`easw\` commands (\`easw build\`, \`easw whoami\`...).`,
          ),
        );
      }
    });

  program
    .command("remove")
    .alias("rm")
    .description("delete an account and its stored token")
    .argument("<name>")
    .action(async (name: string) => {
      const cfg = loadConfig();
      requireAccount(cfg, name);
      await deleteToken(name);
      const createdByLogin = cfg.accounts[name].source === "login";
      delete cfg.accounts[name];
      if (cfg.current === name) cfg.current = null;
      saveConfig(cfg);
      ok(`Account "${name}" removed`);
      if (createdByLogin) {
        console.log(pc.dim(`  The access token EASwitch created is still valid on Expo. Revoke it at ${TOKEN_URL} if you don't need it.`));
      }
      if (cfg.current === null && Object.keys(cfg.accounts).length) {
        console.log(pc.dim("  No current account now. Pick one with `easw use <name>`."));
      }
    });

  program
    .command("link")
    .description("link the current project to an account")
    .argument("<name>")
    .option("--no-hook-prompt", "don't offer to set up `easw hook`")
    .action(async (name: string, opts: { hookPrompt: boolean }) => {
      const cfg = loadConfig();
      requireAccount(cfg, name);
      const root = findProjectRoot(process.cwd());
      const file = writeProjectLink(root, name);
      ok(`Project linked to "${name}" ${pc.dim(`(${path.relative(process.cwd(), file) || file})`)}`);
      if (ensureGitignored(root)) {
        console.log(pc.dim(`  Added ${PROJECT_FILE} to .gitignore, since account names are personal.`));
      }
      console.log(pc.dim(`  \`easw\` commands here now use "${name}" (easw whoami, easw build, easw update...).`));
      const hook = hookStatus();
      if (hook.active) {
        console.log(pc.dim("  Plain `eas` commands here use it too (the shell hook is active)."));
        return;
      }
      if (hook.installed) {
        console.log(pc.dim("  Plain `eas` commands will use it too once this terminal loads the hook. Open a new terminal."));
        return;
      }
      if (!opts.hookPrompt || !process.stdin.isTTY) {
        console.log(pc.dim("  To make plain `eas` commands use it too, run `easw hook` once."));
        return;
      }
      console.log();
      const yes = await confirm({
        message: "Make plain `eas` commands use linked accounts too? (sets up `easw hook`)",
        default: true,
      });
      if (yes) setUpHook(defaultHookShells());
      else console.log(pc.dim("  OK. Run `easw hook` any time to set it up."));
    });

  program
    .command("unlink")
    .description("remove the current project's link")
    .action(() => {
      const link = findProjectLink(process.cwd());
      if (!link) {
        console.log("This project isn't linked to an EASwitch account.");
        return;
      }
      fs.unlinkSync(link.file);
      ok("Project account removed");
    });

  const parseShell = (shell: string | undefined): Shell => {
    if (shell && !(SHELLS as readonly string[]).includes(shell)) {
      throw new EaswError(`Unsupported shell "${shell}"`, `Use one of: ${SHELLS.join(", ")}.`);
    }
    return (shell as Shell | undefined) ?? detectShell();
  };
  const tilde = (file: string) => (file.startsWith(os.homedir()) ? `~${file.slice(os.homedir().length)}` : file);

  const where = (sh: Shell) => (sh === "cmd" ? "Command Prompt (AutoRun)" : tilde(rcFile(sh)));
  const setUpHook = (shells: Shell[]) => {
    let added = false;
    for (const sh of shells) {
      if (sh === "cmd" ? installCmdHook() : installHook(sh, rcFile(sh))) {
        ok(`Added the EASwitch hook to ${where(sh)}`);
        added = true;
      } else {
        console.log(`The EASwitch hook is already in ${where(sh)}.`);
      }
    }
    if (added) {
      console.log(pc.dim("  Open a new terminal for it to take effect."));
      console.log(pc.dim("  Inside linked projects, plain `eas` now uses the linked account. Undo with `easw unhook`."));
    }
  };

  program
    .command("env")
    .description('print shell code that sets EXPO_TOKEN to the account easw would use here, for `eval "$(easw env)"`')
    .argument("[shell]", `${SHELLS.join(", ")} (default: from $SHELL, else PowerShell on Windows and sh elsewhere)`)
    .option("--unset", "print code that clears EXPO_TOKEN instead")
    .addHelpText(
      "after",
      `\nThe token stays set in that shell until it exits or you run the --unset code. Load it with:\n  sh/bash/zsh:  ${envUsage("bash")}\n  fish:         ${envUsage("fish")}\n  PowerShell:   ${envUsage("powershell")}\n  cmd:          ${envUsage("cmd")}`,
    )
    .action(async (shell: string | undefined, opts: { unset?: boolean }) => {
      // $SHELL first, so Git Bash on Windows gets sh syntax; otherwise PowerShell on Windows.
      const fromEnv = path.basename(process.env.SHELL ?? "").replace(/\.exe$/, "");
      const sh: Shell = shell
        ? parseShell(shell)
        : fromEnv === "fish" || fromEnv === "zsh" || fromEnv === "bash"
          ? (fromEnv as Shell)
          : process.platform === "win32"
            ? "powershell"
            : "bash";
      if (opts.unset) {
        process.stdout.write(envCode(sh, null));
        return;
      }
      // Printing a real token to the screen would leave it in the scrollback; eval/source read it from a pipe.
      if (process.stdout.isTTY) {
        throw new EaswError("`easw env` prints your access token, so it doesn't print it to the terminal", `Load it into your shell instead: ${envUsage(sh)}`);
      }
      const cwd = process.cwd();
      const account = resolveAccount(loadConfig(), cwd);
      const token = await getToken(account.name);
      if (!token) {
        throw new EaswError(`No token stored for "${account.name}"`, `Re-add it with \`easw add ${account.name} --force\`.`);
      }
      const via = account.source === "project" ? `linked in ${path.relative(cwd, account.linkFile!) || account.linkFile}` : "current";
      process.stderr.write(pc.dim(`› easw: EXPO_TOKEN set to account "${account.name}" (${via})\n`));
      process.stdout.write(envCode(sh, token));
    });

  program
    .command("hook")
    .description("make plain `eas` use the linked account inside linked projects (sets it up for you)")
    .argument("[shell]", `${SHELLS.join(", ")} (default: your shell; on Windows, PowerShell and cmd)`)
    .action((shell: string | undefined) => {
      setUpHook(shell ? [parseShell(shell)] : defaultHookShells());
    });

  program
    .command("unhook")
    .description("remove the hook added by `easw hook`")
    .argument("[shell]", `${SHELLS.join(", ")} (default: your shell; on Windows, PowerShell and cmd)`)
    .action((shell: string | undefined) => {
      const shells = shell ? [parseShell(shell)] : defaultHookShells();
      let removed = false;
      for (const sh of shells) {
        if (sh === "cmd" ? uninstallCmdHook() : uninstallHook(rcFile(sh))) {
          ok(`Removed the EASwitch hook from ${where(sh)}`);
          removed = true;
        } else {
          console.log(`No EASwitch hook found in ${where(sh)}.`);
        }
      }
      if (removed) console.log(pc.dim("  Open a new terminal for it to take effect."));
    });

  program
    .command("shell-init")
    .description("only show the hook code, to add it to your shell settings yourself (`easw hook` does it for you)")
    .argument("[shell]", SHELLS.join(", "))
    .addHelpText(
      "after",
      '\nAdd to your shell config:\n  zsh/bash:    eval "$(easw shell-init)"\n  fish:        easw shell-init fish | source\n  PowerShell:  easw shell-init powershell | Out-String | Invoke-Expression',
    )
    .action((shell: string | undefined) => {
      process.stdout.write(shellInit(parseShell(shell)));
    });

  // Registered for --help only; main() routes eas and exec before commander parses.
  program
    .command("eas")
    .argument("[args...]")
    .description("run eas the way the shell hook does: the linked account in linked projects, your normal login elsewhere");
  program.command("exec").argument("<command...>").description("run any other program as the selected account");
  program.addHelpText(
    "after",
    `
Any other eas command runs as the selected account, e.g. \`easw build\` or \`easw env:list\`.

Quick start:
  easw add work                 save an account (log in, or paste an access token)
  easw use work                 choose the account easw uses
  easw build --platform ios     run any EAS command as that account
  easw link work                make the current project always use "work"
  easw hook                     optional: make plain \`eas\` use the linked account too
  easw shell-init               optional: only show the hook code, to add it yourself

Docs: https://github.com/iamgarriTech/easwitch#readme`,
  );

  return program;
}

async function main(argv: string[]): Promise<number> {
  const r = route(argv);
  if (r.kind === "run") return runWithAccount(r.command, r.args);
  if (r.kind === "shell-eas") return runShellEas(r.args);
  await buildProgram().parseAsync(argv, { from: "user" });
  return typeof process.exitCode === "number" ? process.exitCode : 0;
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
