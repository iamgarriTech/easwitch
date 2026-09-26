# PRD: EASwitch

## Product

**EASwitch** is an open-source cross-platform CLI that allows developers to manage and switch between multiple Expo/EAS account contexts on one computer.

Primary CLI alias:

```bash
easw
```

Full command:

```bash
easwitch
```

Supported platforms:

- macOS
- Windows
- Linux

## Problem

Developers often work with multiple Expo/EAS accounts across:

- Personal projects
- Company projects
- Client projects
- Organization projects

Expo normally uses one active login session at a time.

Switching accounts repeatedly through login and logout becomes inconvenient.

EASwitch should allow developers to store multiple account contexts and use them without interfering with their normal Expo login.

## Goal

EASwitch should allow developers to:

- Save multiple Expo/EAS account profiles
- Switch between profiles quickly
- Link projects to specific profiles
- Run EAS commands under the correct account
- Keep credentials secure
- Continue using normal Expo/EAS commands normally

## Important Behaviour

EASwitch must not replace or modify the developer's normal Expo login session.

Normal commands should continue working:

```bash
eas login
eas whoami
eas build
eas update
expo start
```

These commands should continue using Expo's normal authentication.

EASwitch commands should use the selected EASwitch account context.

Example:

```bash
eas build
```

Uses:

```text
Normal Expo authentication
```

While:

```bash
easw build
```

Uses:

```text
Selected EASwitch account
```

## Account Profiles

A developer should be able to store multiple accounts.

Example:

```bash
easw add personal
easw add work
easw add client
```

Each account profile should contain:

- Profile name
- Expo account information
- Expo access token

Tokens must be stored securely.

## Add Account

```bash
easw add work
```

Example:

```text
Profile name: work
Expo access token: ************

✓ Account "work" added
```

## List Accounts

```bash
easw list
```

Example:

```text
EASwitch Accounts

● work
○ personal
○ client
```

The currently selected profile should be clearly shown.

## Switch Account

```bash
easw use work
```

Example:

```text
✓ Using EAS account "work"
```

This should change the active EASwitch profile only.

It must not log the developer out of their normal Expo account.

## Current Account

```bash
easw current
```

Example:

```text
Current EASwitch account: work
```

## Remove Account

```bash
easw remove client
```

Example:

```text
✓ Account "client" removed
```

## Project Linking

Developers should be able to associate a project with a specific EASwitch account.

Example:

```bash
cd company-app

easw link work
```

Output:

```text
✓ Project linked to "work"
```

## Unlink Project

```bash
easw unlink
```

Output:

```text
✓ Project account removed
```

## Account Resolution

When an EASwitch command is executed, the account should be selected in this order:

```text
Project-linked account
        ↓
Current EASwitch account
```

Example:

```text
Current EASwitch account: personal

company-app
└── linked account: work
```

Running:

```bash
easw build
```

inside `company-app` should use:

```text
work
```

Outside that project it should use:

```text
personal
```

## Running EAS Commands

EASwitch should allow developers to run EAS commands under the selected account context.

Examples:

```bash
easw build
easw update
easw submit
easw whoami
```

It should also support arbitrary commands:

```bash
easw exec eas build
```

EASwitch should provide the correct Expo authentication context only for that process.

It should not permanently modify the developer's normal Expo environment.

## Example Workflow

```bash
eas login
```

The developer remains logged into their normal personal Expo account.

Then:

```bash
easw add personal
easw add work
easw add client
```

Select work:

```bash
easw use work
```

Run:

```bash
easw whoami
```

Then:

```bash
easw build
```

Both commands should run using the `work` account.

But:

```bash
eas whoami
```

should still return the developer's normal Expo login.

## Authentication

EASwitch should use Expo access tokens for stored profiles.

When running an EASwitch command, the selected account token should be provided to the EAS process temporarily.



## Credential Storage

Tokens must not be stored in plaintext project configuration.

Credentials should use the operating system's secure credential storage where possible.

Examples:

```text
macOS
→ Keychain

Windows
→ Credential Manager

Linux
→ Secret Service / secure keyring
```

## Local Configuration

Non-sensitive configuration may contain information such as:

```json
{
  "accounts": {
    "personal": { "username": "jane", "addedAt": "2026-09-26T10:00:00.000Z" },
    "work": { "username": "jane-acme", "addedAt": "2026-09-26T10:01:00.000Z" }
  },
  "current": "personal"
}
```

`username` is the Expo user the token belongs to, captured when the account is added.

Location: the OS-standard config directory (e.g. `~/Library/Preferences/easwitch/config.json` on macOS), overridable with `EASWITCH_CONFIG_DIR`.

Project configuration lives in `.easwitch.json` at the project root and may contain:

```json
{
  "account": "work"
}
```

No access tokens should appear in these files.

## CLI Commands

```bash
easw add <name>

easw list

easw use <name>

easw current

easw remove <name>

easw link <name>

easw unlink

easw build

easw update

easw submit

easw whoami

easw <any-eas-command>   # e.g. easw env:list, easw build:list

easw exec <command>
```

The full command should also work:

```bash
easwitch use work
```

### Options

```bash
easw add <name> --token <token>   # non-interactive (prefer stdin: flags land in shell history)
echo "$TOKEN" | easw add <name>   # token from stdin
easw add <name> --no-verify       # skip checking the token against Expo
easw add <name> --force           # replace an existing profile's token
```

Any subcommand that isn't an easw command is forwarded to `eas` with every argument untouched, including `--help`.

## Technical Approach

EAS CLI honours the `EXPO_TOKEN` environment variable, which takes precedence over the saved session in `~/.expo/state.json`. EASwitch never touches that file. For every run command it:

1. Resolves the account (project link → current account).
2. Reads that account's token from the OS credential store.
3. Spawns the child process with `EXPO_TOKEN` set in that process's environment only.

The child's exit code is passed through unchanged. A one-line notice naming the account in use is printed to stderr, so stdout stays pipeable.

Stack: Node.js (≥ 20.17) + TypeScript, distributed on npm as `easwitch` with `easw` and `easwitch` bins. `commander` (CLI), `@napi-rs/keyring` (Keychain / Credential Manager / Secret Service), `cross-spawn` (Windows `.cmd` shims), `@inquirer/prompts`, `env-paths`, built with `tsup`.

Credential store entries use service `easwitch` and the profile name as the account.

## Edge-Case Behaviour

- **Token validation:** `easw add` runs `eas whoami` with the new token; a rejected token is not saved.
- **Linked account missing:** if `.easwitch.json` names an account that doesn't exist, the command fails. It never falls back to the current account, since that could build or publish under the wrong Expo account.
- **Link lookup:** `.easwitch.json` is found by walking up from the working directory (like `.git`), so commands work from subdirectories. `easw link` writes it at the nearest directory containing `eas.json`, `app.json`, `app.config.*` or `package.json`. It also adds `.easwitch.json` to an existing `.gitignore` there.
- **`EXPO_TOKEN` already set in the shell:** EASwitch overrides it for the child and prints a warning.
- **First account added** becomes the current account automatically.
- **Removing the current account** leaves no current account; the user picks one with `easw use`.
- **Linux without a keyring:** a clear error explains that a Secret Service provider (gnome-keyring, KWallet) must be running.
- **`eas` not installed:** a clear error suggests `npm install -g eas-cli`.

## Decisions

- **Any eas command can run as the selected account.** EASwitch handles its own commands (`add`, `list`, `use`, `current`, `remove`, `link`, `unlink`, `exec`, `help`) and forwards every other subcommand to `eas` unchanged, so `easw build:list`, `easw env:list` and `easw credentials` all work. EASwitch only supplies the account; `eas` does the work, so this is a layer on top of EAS CLI, not a replacement. An allowlist was rejected because it made `easw build` work but `easw build:list` fail, and it would need updating whenever eas adds commands.
- **`login`, `logout`, `account:login` and `account:logout` are blocked**, since they write the normal Expo session that EASwitch must never touch.
- **`easw --help` lists only easw's own commands**, with one line noting that other eas commands are forwarded.
- **`.easwitch.json` is gitignored by default.** Profile names are personal, so teammates may not share them. `easw link` appends the file to an existing `.gitignore` in the project root. Teams that agree on names can remove that line and commit it.
- **No plaintext fallback when no keyring is available.** It would break the secure-storage guarantee. EASwitch targets developer machines; CI should set `EXPO_TOKEN` directly.


## Non-Goals

EASwitch should not:

- Replace Expo CLI
- Replace EAS CLI
- Change project ownership automatically
- Break normal `eas` or `expo` commands

## Success Criteria

A developer should be able to have:

```text
personal
work
client-a
client-b
```

stored in EASwitch and move between them without repeatedly logging in and out.

At the same time:

```bash
eas build
```

should continue working exactly as it did before EASwitch was installed.

EASwitch should feel like an additional account-context layer on top of EAS, not a replacement for Expo's authentication system.