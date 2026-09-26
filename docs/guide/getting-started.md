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

The first account you add becomes the current one.

## 2. Choose an account and use it

```bash
easw use work                     # or just `easw use` to pick from a list
easw whoami                       # shows the "work" user
easw build --platform ios
easw update --branch production
```

Any EAS CLI command works through `easw`, with all its options: `easw submit`, `easw env:list`, `easw credentials`, `easw build:list` and so on. See the [command reference](/reference/commands#easw-eas-command).

Meanwhile, plain `eas whoami` still shows your normal login.

## 3. Link projects to accounts (optional)

```bash
cd ~/code/acme-app
easw link client-acme
easw build                        # always runs as "client-acme" in this project
```

Once a project is linked, **every `easw` command in it runs as that account**: `easw whoami`, `easw build`, `easw update`, `easw submit`, `easw env:list` and the rest, in every subfolder, whatever account you've chosen with `easw use`.

| In a linked project | Without `easw hook` | After `easw hook` (once) |
|---|---|---|
| `easw whoami`, `easw build`, `easw update`… | ✅ linked account | ✅ linked account |
| `eas whoami`, `eas build`, `eas update`… | your normal login | ✅ linked account |

To make plain `eas` commands follow the link, do step 4. More in [Linking projects](/guide/linking-projects).

## 4. Use plain `eas` too (optional)

```bash
easw hook
```

Open a new terminal. Now plain `eas` also uses the linked account inside linked projects. More in [Use plain eas](/guide/shell-hook).

## Next steps

- [Example: working at Acme](/guide/example-workflow): how one developer uses EASwitch day to day
- [Command reference](/reference/commands): every command and option
- [How it works](/guide/how-it-works): what EASwitch does behind the scenes
- [FAQ](/faq)
