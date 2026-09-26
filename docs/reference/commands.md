# Commands

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
| [`easw exec <command>`](#easw-exec) | Run any other program as the selected account |
| [`easw hook` / `easw unhook`](#easw-hook-easw-unhook) | Turn the shell hook for plain `eas` on or off |
| [`easw shell-init [shell]`](#easw-shell-init) | Show the hook code, to add it to your shell settings yourself |

All commands work the same with `easwitch` instead of `easw`. Every command has built-in help: `easw --help`, or `easw <command> --help`. `easw --version` prints the version.

### `easw add`

```text
easw add <name> [--login [browser|password|sso]] [--token <token>] [--no-verify] [--force]
```

Saves an account under `<name>`. Without options, it asks how you want to add the account (see [Getting started](/guide/getting-started#_1-add-your-accounts)).

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
| `--json` | Print machine-readable JSON (see [Scripts and AI agents](/guide/scripts-and-agents)). With `--check`, each account also gets `valid` and `error`. |

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

Shows the current account, and the linked account if you're inside a linked project. With `--json`, it also reports which account easw would actually use here, and why (see [Scripts and AI agents](/guide/scripts-and-agents)).

### `easw remove`

```text
easw remove <name>        (alias: easw rm)
```

Deletes the account and its token from your machine. If it was the current account, there's no current account until you run `easw use`.

A token that EASwitch created by logging in stays valid on Expo until you revoke it in your [access token settings](https://expo.dev/settings/access-tokens). EASwitch reminds you when you remove such an account.

### `easw link`

```text
easw link <name>
```

Links the project you're in to an account. EASwitch writes a small `.easwitch.json` file (`{ "account": "work" }`) at the project root: the nearest folder containing `eas.json`, `app.json`, `app.config.js`, `app.config.ts` or `package.json`. The link applies in every subfolder.

If the project has a `.gitignore`, EASwitch adds `.easwitch.json` to it, because account names are personal and your teammates may name theirs differently. If your team agrees on names, you can remove that line and commit the file.

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

### `easw hook` / `easw unhook`

```text
easw hook [shell]
easw unhook [shell]
```

`easw hook` makes plain `eas` use the linked account inside linked projects, by adding a line to your shell's startup file. `easw unhook` removes it. `shell` is `zsh`, `bash`, `fish`, `powershell` or `cmd`; by default EASwitch uses your current shell, and on Windows it sets up both PowerShell and Command Prompt. See [Use plain `eas` in linked projects](/guide/shell-hook).

### `easw shell-init`

```text
easw shell-init [shell]
```

Only shows the hook code, without changing anything, so you can add it to your shell settings yourself. `easw hook` does the same thing for you. See [Setting it up yourself](/guide/shell-hook#setting-it-up-yourself).

