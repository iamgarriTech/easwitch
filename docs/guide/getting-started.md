# Getting started

EASwitch is a command-line tool for developers who use more than one Expo account: your own, your employer's, a few clients'. You save each account once, and every `easw` command runs as the right one, without `eas logout` / `eas login`.

## Install

```bash
npm install -g easwitch
```

This gives you two commands, `easw` and `easwitch`, which are identical. Install globally (`-g`) so the commands are on your `PATH`.

- Requires Node.js 20.18+ or 22+, on macOS, Windows or Linux.
- EAS CLI comes bundled, so you don't need to install it separately. If you already have `eas` installed globally, EASwitch uses yours instead, so `easw build` and `eas build` always run the same version.

To update later: `npm install -g easwitch@latest`.

## 1. Add your accounts

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

::: tip Sign in as the right account
The token belongs to whichever Expo account you sign in as. If your browser is already signed in to a different Expo account, switch accounts there first.
:::

## 2. Keep using `eas`: turn on the hook

```bash
easw hook
```

This adds one line to your shell's startup file (zsh, bash, fish, PowerShell or Command Prompt) so plain `eas` goes through EASwitch. Open a new terminal afterwards.

It's safe: outside linked projects, `eas` stays your normal login, and `eas login` / `eas logout` still manage your normal session. Undo it with `easw unhook`. If you skip this step, `easw link` offers to do it for you. More in [Use plain eas](/guide/shell-hook).

## 3. Link each project to its account

```bash
cd ~/code/acme-app
easw link client-acme
```

A linked project uses its account in every subfolder. More in [Linking projects](/guide/linking-projects).

## 4. Use `eas` as usual

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

## Without the hook

You don't have to change `eas`. Type `easw` instead, and you get the same result without the hook:

| In a linked project | With `easw hook` | Without it |
|---|---|---|
| `eas whoami`, `eas build`, `eas update`… | ✅ linked account | your normal login |
| `easw whoami`, `easw build`, `easw update`… | ✅ linked account | ✅ linked account |

`easw` commands outside linked projects use your *current* account, which you choose with `easw use work` (or `easw use` to pick from a list). The first account you add is the current one to start with. Any EAS CLI command works through `easw`: see the [command reference](/reference/commands#easw-eas-command).

## Next steps

- [Example: working at Acme](/guide/example-workflow): how one developer uses EASwitch day to day
- [Command reference](/reference/commands): every command and option
- [How it works](/guide/how-it-works): what EASwitch does behind the scenes
- [FAQ](/faq)
