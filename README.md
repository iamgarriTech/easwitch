# EASwitch

**Use multiple Expo/EAS accounts on one machine, without logging in and out.**

[![npm](https://img.shields.io/npm/v/easwitch)](https://www.npmjs.com/package/easwitch)
[![CI](https://github.com/iamgarriTech/easwitch/actions/workflows/ci.yml/badge.svg)](https://github.com/iamgarriTech/easwitch/actions/workflows/ci.yml)

If you build apps for yourself, your company and a couple of clients, you know the routine: `eas logout`, `eas login`, run a build, switch back. EASwitch removes that. You save each account once, and every `easw` command runs under the right one, picked from the project you're in or the account you've selected.

Your normal Expo login is never touched. `eas build`, `eas whoami` and `expo start` keep working exactly as before.

```bash
easw add work               # save an account once
easw use work               # select it

easw build --platform ios   # runs `eas build` as "work"
eas whoami                  # still your normal login
```

## Install

```bash
npm install -g easwitch
```

This gives you two commands, `easw` and `easwitch` (identical). Install globally (`-g`) so the commands are on your `PATH`. Requires Node.js 20.18+ or 22+.

EAS CLI comes bundled, so you don't need to install it separately. If you already have `eas` installed globally, EASwitch uses yours instead, so `easw build` and `eas build` always run the same version.

## Quick start

**1. Add your accounts.**

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

**2. Pick an account and use it.**

```bash
easw use work
easw whoami          # shows the "work" user
easw build
easw update --branch production
```

**3. (Optional) Link projects to accounts** so you never have to think about it:

```bash
cd ~/code/acme-app
easw link client-acme
easw build           # always runs as "client-acme" inside this project
```

## Commands

| Command | What it does |
|---|---|
| `easw add <name>` | Save an account, by logging in to Expo or pasting an access token. |
| `easw list` | List saved accounts. The current one is marked `●`. Add `--check` to test each token with Expo and flag revoked or expired ones. |
| `easw use [name]` | Set the current account. Without a name, pick from a list. |
| `easw current` | Show the current account, and the project's linked account if there is one. |
| `easw remove <name>` | Delete an account and its stored token. |
| `easw link <name>` | Link the current project to an account. |
| `easw unlink` | Remove the current project's link. |
| `easw exec <command...>` | Run any command with the selected account, e.g. `easw exec npx expo-doctor`. |
| `easw <eas command>` | Any other command is passed to EAS CLI as the selected account: `easw build`, `easw submit`, `easw env:list`, `easw credentials`, `easw build:list`… |

All arguments after an eas command are passed through untouched, so `easw build --platform android --profile preview` works exactly like the `eas` version.

`easw login` and `easw logout` are deliberately blocked, since they would change your normal Expo login. Use `eas login` for that.

### `add` options

```bash
easw add work --login           # log in with the browser, skipping the menu
easw add work --login password  # log in with email or username and password
easw add work --login sso       # log in with SSO
easw add work --token <token>   # non-interactive (note: ends up in shell history)
echo "$TOKEN" | easw add work   # read the token from stdin
easw add work --no-verify       # skip checking the token with Expo
easw add work --force           # replace the token of an existing account
```

## Which account is used?

Every `easw` command picks an account in this order:

1. **The project's linked account.** EASwitch looks for a `.easwitch.json` in the current directory and its parents, so it works from any subfolder.
2. **The current account**, set with `easw use`.

Before running, EASwitch prints which account it picked, and why:

```text
› easw: using account "client-acme" (linked in .easwitch.json)
```

This line goes to stderr, so piping the command's output still works.

If a project is linked to an account you don't have (for example, after `easw remove`), the command stops with an error instead of falling back to your current account, so you never build or publish under the wrong account by accident.

## How it works

EAS CLI reads an `EXPO_TOKEN` environment variable and, when it's set, uses that token instead of your saved login. EASwitch:

1. works out which account to use,
2. reads that account's token from your system's credential store,
3. runs the command with `EXPO_TOKEN` set **for that one process only**.

Nothing is written to your shell, your Expo login (`~/.expo/state.json`), or your project's Expo config. When the command exits, its exit code is passed straight back, so `easw` works in scripts.

## Where things are stored

| What | Where |
|---|---|
| Access tokens | Your OS credential store: **macOS** Keychain, **Windows** Credential Manager, **Linux** Secret Service (GNOME Keyring, KWallet) |
| Account list and current account | `config.json` in your OS config directory, e.g. `~/Library/Preferences/easwitch/` on macOS. No tokens. |
| Project link | `.easwitch.json` in the project root: `{ "account": "work" }`. No tokens. |

`easw link` adds `.easwitch.json` to your project's `.gitignore` if one exists, because account names are personal and your teammates may name theirs differently. If your team agrees on names, you can remove that line and commit the file.

On Linux, a Secret Service provider (such as GNOME Keyring or KWallet) must be running and unlocked. EASwitch won't store tokens in a plain file.

## Scripts and AI agents

EASwitch works without a terminal, so shell scripts and AI coding agents can use it too:

```bash
easw current --json   # which account easw would use here, and why
easw list --json      # all accounts, marking the current and linked ones
easw list --check     # test every token with Expo; exits 1 if any are invalid
echo "$TOKEN" | easw add work   # add an account non-interactively
```

```json
{
  "current": "personal",
  "project": { "account": "work", "file": "/Users/jane/code/acme-app/.easwitch.json" },
  "resolved": { "name": "work", "source": "project" },
  "error": null
}
```

Wrapped commands keep their exit codes and stdout, and easw's own status line goes to stderr. Without a terminal, `easw add` fails with a clear message rather than waiting for input.

If you're using an AI assistant to work on EASwitch itself, [AGENTS.md](AGENTS.md) gives it an overview of the codebase.

## FAQ

**Does this log me out of Expo?**
No. EASwitch never runs `eas login` or `eas logout` and never touches your saved Expo session.

**Can I use it in CI?**
You don't need to. In CI, set `EXPO_TOKEN` as a secret and run `eas` directly. EASwitch is for developer machines with several accounts.

**Why is `easw build` using a different EAS CLI version than I expected?**
EASwitch uses your global `eas` if one is on your `PATH`, otherwise its bundled copy. The status line says `bundled eas-cli <version>` when the bundled one runs. To use a specific version, install it globally: `npm install -g eas-cli@<version>`.

**Should I log in or paste a token?**
Logging in is quicker: EASwitch creates the token for you. Pasting a token gives you more control, for example to use a robot user's token from your organization's settings, which you can limit to specific permissions. Both are stored the same way.

**What happens to the token when I remove an account?**
`easw remove` deletes it from your machine. A token EASwitch created by logging in stays valid on Expo until you revoke it in your [access token settings](https://expo.dev/settings/access-tokens); EASwitch reminds you when you remove the account.

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

Set `EASWITCH_CONFIG_DIR` to use a throwaway config directory while testing.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and guidelines, and [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

[MIT](LICENSE)
