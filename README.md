# EASwitch

**Use multiple Expo/EAS accounts on one machine, without logging in and out.**

[![npm](https://img.shields.io/npm/v/easwitch)](https://www.npmjs.com/package/easwitch)
[![CI](https://github.com/iamgarriTech/easwitch/actions/workflows/ci.yml/badge.svg)](https://github.com/iamgarriTech/easwitch/actions/workflows/ci.yml)
[![Fund my work on FLOSSAfrica](https://flossafrica.com/badge.svg)](https://flossafrica.com/m/iamgarritech?p=easwitch)

**📖 Documentation: [iamgarritech.github.io/easwitch](https://iamgarritech.github.io/easwitch/)**

If you build apps for yourself, your company and a couple of clients, you know the routine: `eas logout`, `eas login`, run a build, switch back. EASwitch removes that. You save each account once, and every `easw` command runs as the right one, picked from the project you're in or the account you've selected.

Your normal Expo login is never touched. `eas build`, `eas whoami` and `expo start` keep working exactly as before.

![EASwitch demo: linking a project, turning on the shell hook, then using plain eas as the linked account](https://raw.githubusercontent.com/iamgarriTech/easwitch/main/docs/demo/demo.gif)

## Quick start

Set up once:

```bash
npm install -g easwitch       # install (EAS CLI is included)

easw add personal             # save each account once: log in, or paste an access token
easw add work
easw hook                     # plain `eas` now follows project links (then open a new terminal)

cd ~/code/acme-app
easw link work                # this project belongs to "work"
```

Then keep using `eas` as usual:

```bash
eas whoami                    # in acme-app: the "work" user
eas build --platform ios      # built as "work"
cd ~ && eas whoami            # everywhere else: your normal login
```

Prefer not to change `eas`? Skip `easw hook` and type `easw` instead (`easw whoami`, `easw build`…). To add the hook to your shell config yourself, use `easw shell-init`.

## Contents

- [Install](#install)
- [Getting started](#getting-started)
- [Example: working at Acme](#example-working-at-acme)
- [Command reference](#command-reference)
- [Use plain `eas` in linked projects](#use-plain-eas-in-linked-projects)
- [Which account is used?](#which-account-is-used)
- [How it works](#how-it-works)
- [Where things are stored](#where-things-are-stored)
- [Environment variables](#environment-variables)
- [Scripts and AI agents](#scripts-and-ai-agents)
- [FAQ](#faq)

## Install

```bash
npm install -g easwitch
```

This gives you two commands, `easw` and `easwitch`, which are identical. Install globally (`-g`) so the commands are on your `PATH`. Requires Node.js 20.18+ or 22+, on macOS, Windows or Linux.

EAS CLI comes bundled, so you don't need to install it separately. If you already have `eas` installed globally, EASwitch uses yours instead, so `easw build` and `eas build` always run the same version.

To update: `npm install -g easwitch@latest`.

## Getting started

### 1. Add your accounts

```bash
easw add personal
easw add work
easw add client-acme
```

Each one asks how you want to add the account:

```text
Adding account "work"

? How do you want to add this account?
❯ Log in with Expo in your browser (recommended)
  Log in with email or username and password
  Log in with SSO
  Paste an access token
```

- **Log in** (browser, email and password, or SSO): EASwitch runs Expo's own login in a temporary, separate session, so your normal Expo login isn't affected. It uses that session to create an access token named `EASwitch: work on <your computer>`, then logs the temporary session out and deletes it. You can see or revoke the token anytime in your [access token settings](https://expo.dev/settings/access-tokens).
- **Paste an access token**: create one yourself at [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) and paste it. Pressing Enter on an empty prompt opens that page.

Either way, the token is checked with Expo and stored in your system's credential store:

```text
✓ Account "work" added (Expo user: jane-acme)
```

Sign in as the account you're adding. If your browser is already signed in to a different Expo account, switch accounts there first.

### 2. Keep using `eas`: turn on the hook

```bash
easw hook
```

This adds one line to your shell's startup file (zsh, bash, fish, PowerShell or Command Prompt) so plain `eas` goes through EASwitch. Open a new terminal afterwards. It's safe: outside linked projects, `eas` stays your normal login, and `eas login` / `eas logout` still manage your normal session. Undo it with `easw unhook`.

If you skip this step, `easw link` offers to do it for you.

### 3. Link each project to its account

```bash
cd ~/code/acme-app
easw link client-acme
```

A linked project uses its account in every subfolder.

### 4. Use `eas` as usual

```bash
cd ~/code/acme-app
eas whoami                        # the client-acme user
eas build --platform ios
eas update --branch production
```

```text
› easw: using account "client-acme" (linked in .easwitch.json)
```

That line shows whenever `eas` is running as a linked account. Outside linked projects, `eas` is your normal Expo login.

### Without the hook

You don't have to change `eas`. Type `easw` instead, and you get the same result without the hook:

| In a linked project | With `easw hook` | Without it |
|---|---|---|
| `eas whoami`, `eas build`, `eas update`… | ✅ linked account | your normal login |
| `easw whoami`, `easw build`, `easw update`… | ✅ linked account | ✅ linked account |

`easw` commands outside linked projects use your *current* account, which you choose with `easw use work` (or `easw use` to pick from a list). The first account you add is the current one to start with.

## Example: working at Acme

Jane works at **Acme** (a made-up company), freelances for a client called **Globex**, and has her own side projects. Each has its own Expo account.

**Once, on day one:**

```bash
npm install -g easwitch
easw add personal                 # log in as her personal Expo user
easw add acme                     # log in with her Acme work account (SSO)
easw add globex                   # paste the access token the client gave her

easw hook                         # so she can keep typing plain `eas`

cd ~/code/acme-shop   && easw link acme
cd ~/code/globex-app  && easw link globex
```

**Every day after that**, she keeps using `eas` and just changes folders:

```bash
cd ~/code/acme-shop
eas whoami                        # jane-acme
eas build --platform ios          # built under Acme
eas update --branch production    # published under Acme

cd ~/code/globex-app
eas submit --platform android     # submitted under Globex

cd ~/code/my-side-project
eas whoami                        # her normal Expo login: jane
```

Every `eas` command in a linked project, from `eas whoami` to `eas submit`, runs as that project's account. She never types an account name, and the `› easw: using account …` line always shows which one ran. Right after linking, `eas whoami` is a quick check that the project uses the Expo user she expects.

That's thanks to `easw hook`. Without it, she'd type `easw` instead of `eas` (`easw build`, `easw submit`…) and get the same result.

> **User, not organization:** an EASwitch account picks the Expo **user** whose token runs the command. It doesn't choose an Expo organization or change who owns the app. Acme's app must already belong to Acme's Expo organization, and `jane-acme` must have access to it.

**When things change:**

| Situation | What she does |
|---|---|
| A client revokes a token | `easw list --check` shows which one; `easw add globex --force` replaces it |
| A new teammate joins Acme | They run `easw add acme` and `easw link acme` on their machine (`.easwitch.json` is gitignored) |
| She gets a new laptop | Tokens stay in each computer's keychain, so she runs `easw add` again for each account |
| The Globex contract ends | `easw unlink` in the project, then `easw remove globex` |

The [docs site has the full walkthrough](https://iamgarritech.github.io/easwitch/guide/example-workflow).

## Command reference

| Command | What it does |
|---|---|
| [`easw add <name>`](#easw-add) | Save an account, by logging in to Expo or pasting an access token |
| [`easw list`](#easw-list) | List your accounts, and optionally check their tokens |
| [`easw use [name]`](#easw-use) | Choose the current account |
| [`easw current`](#easw-current) | Show the current account and the project's linked account |
| [`easw remove <name>`](#easw-remove) | Delete an account and its token |
| [`easw link <name>`](#easw-link) | Link the current project to an account |
| [`easw unlink`](#easw-unlink) | Remove the current project's link |
| [`easw <eas command>`](#easw-eas-command) | Run any EAS CLI command as the selected account |
| [`easw eas <args>`](#easw-eas) | Run eas the way the shell hook does: the linked account in linked projects, your normal login elsewhere |
| [`easw exec <command>`](#easw-exec) | Run any other program as the selected account |
| [`easw env`](#easw-env) | Print shell code that sets `EXPO_TOKEN` to the account easw would use, for `eval "$(easw env)"` |
| [`easw hook` / `easw unhook`](#easw-hook--easw-unhook) | Turn the shell hook for plain `eas` on or off |
| [`easw shell-init [shell]`](#easw-shell-init) | Show the hook code, to add it to your shell settings yourself |

Every command has built-in help: `easw --help`, or `easw <command> --help`. `easw --version` prints the version.

### `easw add`

```text
easw add <name> [--login [browser|password|sso]] [--token <token>] [--no-verify] [--force]
```

Saves an account under `<name>`. Without options, it asks how you want to add the account (see [Getting started](#1-add-your-accounts)).

| Option | What it does |
|---|---|
| `--login [method]` | Log in to Expo instead of pasting a token, skipping the menu. `method` is `browser` (default), `password` or `sso`. |
| `--token <token>` | Use this access token without prompting. It ends up in your shell history, so prefer the prompt or stdin. |
| `--no-verify` | Don't check the token with Expo before saving it. |
| `-f`, `--force` | Replace the token of an account that already exists. |

You can also pipe a token in: `echo "$TOKEN" | easw add work`. Without a terminal (in a script, CI or an AI agent), `easw add` needs `--token` or a piped token, and fails with a clear message otherwise. Logging in always needs a terminal.

Account names can use letters, numbers, dots, dashes and underscores, start with a letter or number, and be up to 64 characters.

### `easw list`

```text
easw list [--check] [--json]        (alias: easw ls)
```

Lists your accounts. The current account is marked `●`, and the account linked to the project you're in is marked `(linked to this project)`.

| Option | What it does |
|---|---|
| `--check` | Ask Expo whether each stored token still works, and flag revoked or expired ones. Exits with code 1 if any are invalid. Also fills in missing usernames. |
| `--json` | Print machine-readable JSON (see [Scripts and AI agents](#scripts-and-ai-agents)). With `--check`, each account also gets `valid` and `error`. |

```text
● work      jane-acme  ✓ valid
○ client    ✗ The bearer token is invalid.

Replace a token with `easw add client --force`.
```

### `easw use`

```text
easw use [name]
```

Sets the current account: the one easw uses outside linked projects. Without a name, it shows a list to pick from. It doesn't change your normal `eas` login.

If you run it inside a project linked to a different account, easw reminds you that the project's link takes priority there.

### `easw current`

```text
easw current [--json]
```

Shows the current account, and the linked account if you're inside a linked project. It also warns you when plain `eas` won't follow the link:

```text
Current EASwitch account: personal
This project is linked to: work (/Users/jane/code/acme-app/.easwitch.json)
⚠ Plain `eas` here still uses your normal Expo login, not "work". Run `easw hook` so it follows the link, or use `easw` commands (`easw build`, `easw whoami`...).
```

If the hook is set up but the terminal was opened before that, it tells you to open a new terminal. When the hook is active, it confirms that plain `eas` uses the linked account.

With `--json`, it also reports which account easw would actually use here, and why, and whether the shell hook is active (see [Scripts and AI agents](#scripts-and-ai-agents)).

### `easw remove`

```text
easw remove <name>        (alias: easw rm)
```

Deletes the account and its token from your machine. If it was the current account, there's no current account until you run `easw use`.

A token that EASwitch created by logging in stays valid on Expo until you revoke it in your [access token settings](https://expo.dev/settings/access-tokens). EASwitch reminds you when you remove such an account.

### `easw link`

```text
easw link <name> [--no-hook-prompt]
```

Links the project you're in to an account. EASwitch writes a small `.easwitch.json` file (`{ "account": "work" }`) at the project root: the nearest folder containing `eas.json`, `app.json`, `app.config.js`, `app.config.ts` or `package.json`. The link applies in every subfolder.

If the project has a `.gitignore`, EASwitch adds `.easwitch.json` to it, because account names are personal and your teammates may name theirs differently. If your team agrees on names, you can remove that line and commit the file.

If the [shell hook](#use-plain-eas-in-linked-projects) isn't set up yet, `easw link` asks whether to set it up, so plain `eas` commands use linked accounts too. Pass `--no-hook-prompt` to skip the question. Without a terminal it never asks, and just prints a tip.

### `easw unlink`

```text
easw unlink
```

Removes the project's `.easwitch.json`, so easw goes back to using the current account there.

### `easw <eas command>`

```text
easw <eas command> [arguments...]
```

Any command that isn't one of EASwitch's own is passed to EAS CLI, as the selected account, with every argument untouched:

```bash
easw build --platform android --profile preview
easw update --branch production --message "Fix login"
easw submit --platform ios
easw whoami
easw env:list --environment production
easw credentials
easw build:list
```

`easw login`, `easw logout`, `easw account:login` and `easw account:logout` are blocked, because they would change your normal Expo login. Use `eas login` for that. To add an account, use `easw add`.

### `easw eas`

```text
easw eas [arguments...]
```

Runs EAS CLI exactly the way the [shell hook](#use-plain-eas-in-linked-projects) does. The hook is just a shell function that calls `easw eas`:

- **Inside a linked project:** runs `eas` as the linked account.
- **Everywhere else:** runs your normal `eas`, unchanged.
- **`easw eas login` / `easw eas logout`:** always your normal session.

Use it in scripts and CI when you want that behaviour without depending on anyone's shell setup:

```bash
easw eas build --platform ios --non-interactive
```

How it differs from the others: `easw build` always uses an EASwitch account (the linked one, or your current one) and fails if there isn't one, while `easw eas build` falls back to your normal login outside linked projects.

### `easw exec`

```text
easw exec [--] <command> [arguments...]
```

Runs any program with the selected account's token set as `EXPO_TOKEN`, for tools other than EAS CLI or your own scripts:

```bash
easw exec npm run release
easw exec npx eas-cli@latest build
easw exec -- node scripts/deploy.js --dry-run
```

Everything after `exec` is passed to the program untouched; the `--` is optional.

### `easw env`

```text
easw env [shell] [--unset]
```

Prints shell code that sets `EXPO_TOKEN` to the account easw would use here (the linked one, or your current one), so a script can adopt it in one line:

```bash
eval "$(easw env)"        # EXPO_TOKEN is now set in this shell
eas build --platform ios  # any tool that reads EXPO_TOKEN uses that account
eval "$(easw env --unset)"
```

EASwitch picks the format from your `$SHELL` (so Git Bash on Windows gets sh syntax), otherwise PowerShell on Windows and sh elsewhere. Name the shell to choose:

| Shell | Load it with |
|---|---|
| sh, bash, zsh | `eval "$(easw env)"` |
| fish | `easw env fish \| source` |
| PowerShell | `easw env powershell \| Out-String \| Invoke-Expression` |
| Command Prompt | `for /f "delims=" %i in ('easw env cmd') do %i` |

- **Stays set:** unlike other easw commands, this leaves the token set in that shell until it exits, or you run the `--unset` code. Prefer `easw eas` or `easw exec` when you only need it for one command.
- **Won't print to the screen:** `easw env` refuses to print the token straight into a terminal, so it doesn't end up visible or in your scrollback. `eval "$(…)"` still works, because the output goes to the shell.
- **`--unset`** prints the code that clears `EXPO_TOKEN` again.

### `easw hook` / `easw unhook`

```text
easw hook [shell]
easw unhook [shell]
```

`easw hook` makes plain `eas` use the linked account inside linked projects, by adding a line to your shell's startup file. `easw unhook` removes it. `shell` is `zsh`, `bash`, `fish`, `powershell` or `cmd`; by default EASwitch uses your current shell, and on Windows it sets up both PowerShell and Command Prompt. See [Use plain `eas` in linked projects](#use-plain-eas-in-linked-projects).

### `easw shell-init`

```text
easw shell-init [shell]
```

Only shows the hook code, without changing anything, so you can add it to your shell settings yourself. `easw hook` does the same thing for you. See [Setting it up yourself](#setting-it-up-yourself).

## Use plain `eas` in linked projects

By default, plain `eas` always uses your normal Expo login, and only `easw` commands switch accounts. If you'd rather type `eas` everywhere, turn on the shell hook:

```bash
easw hook
```

Then open a new terminal. Inside projects you've linked with `easw link`, plain `eas` now runs as the linked account. Everywhere else, it's your normal `eas`.

```text
$ cd ~/code/acme-app       # linked to client-acme
$ eas build --platform ios
› easw: using account "client-acme" (linked in .easwitch.json)
...
$ cd ~ && eas whoami       # not a linked project
jane
```

- The `› easw:` line shows whenever plain `eas` is running as a linked account.
- `eas login` and `eas logout` always go to your normal session.
- If you don't have EAS CLI installed globally, plain `eas` uses the copy bundled with EASwitch.
- The hook applies to interactive terminals. Scripts should call `easw` directly.

To turn it off, run `easw unhook` and open a new terminal.

### `easw hook` or `easw shell-init`?

Both turn on the same thing. The difference is who sets it up:

- **`easw hook` sets it up for you.** Run it once, open a new terminal, and you're done.
- **`easw shell-init` only shows you the code.** You copy it into your shell settings yourself.

If you're not sure, use `easw hook`.

### Supported shells

| Shell | Where `easw hook` adds the hook |
|---|---|
| zsh | `~/.zshrc` |
| bash | `~/.bash_profile` on macOS, `~/.bashrc` on Linux |
| fish | `~/.config/fish/config.fish` |
| PowerShell | Your PowerShell profile (`$PROFILE`) |
| Command Prompt (cmd) | A `doskey` macro, loaded through cmd's AutoRun setting (`HKCU\Software\Microsoft\Command Processor`). Any AutoRun command you already have is kept. |

EASwitch detects your shell automatically. To choose one, name it: `easw hook fish`. On Windows, `easw hook` sets up both PowerShell and Command Prompt.

### Setting it up yourself

If you'd rather edit your config by hand, add the line for your shell instead of running `easw hook`:

| Shell | Add this line |
|---|---|
| zsh (`~/.zshrc`), bash (`~/.bashrc`) | `eval "$(easw shell-init)"` |
| fish (`config.fish`) | `easw shell-init fish \| source` |
| PowerShell (`$PROFILE`) | `easw shell-init powershell \| Out-String \| Invoke-Expression` |
| Command Prompt | `doskey eas=easw __shell-eas $*` in a script run by AutoRun |

## Which account is used?

Every `easw` command picks an account in this order:

1. **The project's linked account.** EASwitch looks for a `.easwitch.json` in the current folder and its parents, so it works from any subfolder.
2. **The current account**, set with `easw use`.

Before running, EASwitch prints which account it picked, and why:

```text
› easw: using account "client-acme" (linked in .easwitch.json)
```

This line goes to stderr, so piping the command's output still works. When the bundled EAS CLI runs, the line also says `bundled eas-cli <version>`.

If a project is linked to an account you don't have (for example, after `easw remove`), the command stops with an error instead of falling back to your current account, so you never build or publish under the wrong account by accident.

## How it works

EAS CLI reads an `EXPO_TOKEN` environment variable and, when it's set, uses that token instead of your saved login. EASwitch:

1. works out which account to use,
2. reads that account's token from your system's credential store,
3. runs the command with `EXPO_TOKEN` set **for that one process only**.

Nothing is written to your shell, your Expo login (`~/.expo/state.json`), or your project's Expo config. The one exception is `easw env`, which you run on purpose to set `EXPO_TOKEN` in a shell. When the command exits, its exit code is passed straight back, so `easw` works in scripts.

## Where things are stored

| What | Where |
|---|---|
| Access tokens | Your OS credential store: **macOS** Keychain, **Windows** Credential Manager, **Linux** Secret Service (GNOME Keyring, KWallet) |
| Account list and current account | `config.json` in your OS config folder, e.g. `~/Library/Preferences/easwitch/` on macOS. No tokens. |
| Project link | `.easwitch.json` in the project root. No tokens. |
| Shell hook | One marked line in your shell's startup file, or for Command Prompt a small script in EASwitch's config folder plus an AutoRun entry |

On Linux, a Secret Service provider (such as GNOME Keyring or KWallet) must be running and unlocked. EASwitch won't store tokens in a plain file.

## Environment variables

| Variable | Effect |
|---|---|
| `EASWITCH_CONFIG_DIR` | Use this folder for EASwitch's config instead of the default. Its tokens are kept in a separate part of the credential store, so it's safe for testing without touching your real accounts. |
| `EXPO_TOKEN` | If it's already set in your shell, EASwitch overrides it for the commands it runs, and prints a warning. |
| `NO_COLOR` | Turn off colored output. |
| `EASWITCH_HOOK` | Set to `1` by the shell hook in terminals that have loaded it. `easw current` uses it to tell whether plain `eas` follows links. You don't set it yourself. |

## Scripts and AI agents

EASwitch works without a terminal, so shell scripts and AI coding agents can use it too:

```bash
easw eas build --platform ios   # like the shell hook: linked account in linked projects, normal login elsewhere
eval "$(easw env)"    # set EXPO_TOKEN in this script to the account easw would use here
easw current --json   # which account easw would use here, and why
easw list --json      # all accounts, marking the current and linked ones
easw list --check     # test every token with Expo; exits 1 if any are invalid
echo "$TOKEN" | easw add work   # add an account non-interactively
```

`easw current --json` returns:

```json
{
  "current": "personal",
  "project": { "account": "work", "file": "/Users/jane/code/acme-app/.easwitch.json" },
  "resolved": { "name": "work", "source": "project" },
  "error": null,
  "hook": { "installed": true, "active": true },
  "plainEasFollowsLink": true
}
```

`resolved.source` is `project` or `current`. When no account can be used, `resolved` is `null` and `error` says why. `hook.active` says whether plain `eas` goes through EASwitch in this shell. `plainEasFollowsLink` is `null` outside linked projects.

**In CI**, you usually don't need EASwitch: set `EXPO_TOKEN` as a secret and run `eas`. If your scripts already use EASwitch, `easw eas` is the supported entry point.

**Exit codes:** commands run through easw return their own exit code. easw's own errors exit with 1, `easw list --check` exits with 1 if any token is invalid, and pressing Ctrl+C at a prompt exits with 130.

If you're using an AI assistant to work on EASwitch itself, [AGENTS.md](AGENTS.md) gives it an overview of the codebase.

## FAQ

**Does this log me out of Expo?**
No. EASwitch never runs `eas login` or `eas logout` against your normal session and never touches `~/.expo`.

**Should I log in or paste a token?**
Logging in is quicker: EASwitch creates the token for you. Pasting a token gives you more control, for example to use a robot user's token from your organization's settings, which you can limit to specific permissions. Both are stored the same way.

**What happens to the token when I remove an account?**
`easw remove` deletes it from your machine. A token EASwitch created by logging in stays valid on Expo until you revoke it in your [access token settings](https://expo.dev/settings/access-tokens).

**How do I know if a token stopped working?**
Run `easw list --check`. Replace a broken token with `easw add <name> --force`.

**Can I use it in CI?**
You don't need to. In CI, set `EXPO_TOKEN` as a secret and run `eas` directly. EASwitch is for developer machines with several accounts.

**Which EAS CLI version does it use?**
Your global `eas` if one is on your `PATH`, otherwise the copy bundled with EASwitch. The status line says `bundled eas-cli <version>` when the bundled one runs. To use a specific version, install it globally: `npm install -g eas-cli@<version>`.

**Should I commit `.easwitch.json`?**
Usually not, since account names are personal. That's why `easw link` adds it to `.gitignore`. If your whole team uses the same account names, committing it is fine.

## Development

```bash
git clone https://github.com/iamgarriTech/easwitch.git
cd easwitch
npm install
npm run build        # bundle to dist/
npm link             # put `easw` / `easwitch` on your PATH
npm test             # unit tests
npm run typecheck
npm run smoke        # end-to-end check against your real credential store (cleans up after itself)
```

Set `EASWITCH_CONFIG_DIR` to use a throwaway config folder while testing.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and guidelines, and [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

[MIT](LICENSE)
