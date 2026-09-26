# Example: working at Acme

This walks through how one developer uses EASwitch day to day. The people and companies are made up; swap in your own.

## The situation

Jane is a React Native developer. She works with three Expo accounts:

| Account | What it's for | Expo user |
|---|---|---|
| Personal | Her own side-project apps | `jane` |
| Acme | Her employer, **Acme**, where she works on the Acme Shop app | `jane-acme` |
| Globex | A client she freelances for | a robot user the client gave her |

Before EASwitch, every switch meant `eas logout`, `eas login`, then remembering to switch back. Once, she nearly published an Acme update from her personal account.

## Day one: set up once

```bash
npm install -g easwitch
```

She adds each account once:

```bash
easw add personal     # "Log in with Expo in your browser", signed in as jane
easw add acme         # "Log in with SSO", with her Acme work login
easw add globex       # "Paste an access token": the client sent her a robot token
```

She keeps typing plain `eas` out of habit, so she turns on the shell hook once, and opens a new terminal:

```bash
easw hook
```

```text
✓ Account "personal" added (Expo user: jane)
✓ Account "acme" added (Expo user: jane-acme)
✓ Account "globex" added (Expo user: globex-ci)
```

Her personal account was added first, so it's the current one: the account easw uses outside linked projects.

## Link each project to its account

```bash
cd ~/code/acme-shop
easw link acme

cd ~/code/globex-app
easw link globex
```

Each project now has a small `.easwitch.json` saying which account it belongs to. EASwitch also added it to each project's `.gitignore`, because account names are personal.

**From now on, every `eas` command in a linked project runs as that project's account**, thanks to the hook. Not just builds: `eas whoami`, `eas build`, `eas update`, `eas submit`, `eas env:list`, `eas credentials` all use it, in the project folder and all its subfolders. (If she hadn't set up the hook, `easw link` would have offered to.)

::: tip Check the link right away
Run `eas whoami` in the project. It should show the Expo user you expect, `jane-acme` here. If it shows another user, the token belongs to the wrong account: add it again with `easw add acme --force` and sign in as the right user.
:::

::: info User, not organization
An EASwitch account picks the Expo **user** whose token runs the command. It doesn't choose an Expo organization or change who owns the app. Acme's app must already belong to Acme's Expo organization, and `jane-acme` must have access to it.
:::

## A normal day

Morning, working on Acme Shop. She types `eas`, as always:

```bash
cd ~/code/acme-shop
eas whoami
```

```text
› easw: using account "acme" (linked in .easwitch.json)
jane-acme (authenticated using EXPO_TOKEN)
```

```bash
eas build --platform ios
eas update --branch production --message "Fix checkout button"
eas env:list --environment production
```

All three run as Acme. She never typed `acme`.

Afternoon, a fix for the client:

```bash
cd ~/code/globex-app/src/screens
eas submit --platform android
```

```text
› easw: using account "globex" (linked in ../../.easwitch.json)
```

It works from a subfolder too. EASwitch found the link at the project root.

Evening, her own app, which isn't linked:

```bash
cd ~/code/my-habit-tracker
eas whoami
```

```text
jane
```

This project isn't linked, so `eas` is just her normal Expo login, untouched. (`easw` commands in unlinked folders use her current EASwitch account, `personal`.)

## Without the hook

If Jane didn't want `eas` to change, she could skip `easw hook` and type `easw` instead: `easw whoami`, `easw build`, `easw submit`. They use the linked account the same way, and plain `eas` stays her normal login everywhere.

## Checking where she is

When she's unsure which account a folder uses:

```bash
easw current
```

```text
Current EASwitch account: personal
This project is linked to: acme (/Users/jane/code/acme-shop/.easwitch.json)
```

## Common situations

### The client revoked a token

A Globex build fails with an authentication error. She checks all her tokens:

```bash
easw list --check
```

```text
○ acme      jane-acme  ✓ valid
○ globex    ✗ The bearer token is invalid.
● personal  jane       ✓ valid

Replace a token with `easw add globex --force`.
```

The client sends a new token, and she replaces it:

```bash
easw add globex --force
```

### A new teammate joins Acme

Her teammate Sam clones `acme-shop`. `.easwitch.json` is gitignored, so Sam sets up his own:

```bash
npm install -g easwitch
easw add acme
cd acme-shop && easw link acme
```

Sam can pick any local name for the account; it only has to match what he links. If a link file had been committed with an account name Sam doesn't have, EASwitch would stop with an error instead of quietly using another account.

### A new laptop

Tokens are stored in each computer's own keychain, so on a new machine she runs `easw add` for each account again and re-links her projects.

### The contract ends

When the Globex work finishes:

```bash
cd ~/code/globex-app && easw unlink
easw remove globex
```

If she had added Globex by logging in, EASwitch would remind her to also revoke the token it created, in her [access token settings](https://expo.dev/settings/access-tokens). Here the client owns the robot token, so they revoke it.

## What Jane gets out of it

- She switches between Acme, Globex and personal work by changing folders.
- She keeps typing `eas`. In a linked project, every command from `eas whoami` to `eas submit` uses the right account.
- The status line always says which account ran, and why.
- A project linked to an account she doesn't have stops with an error, so nothing ships under the wrong account.
- Her normal `eas` login keeps working as before.

Next: [Command reference](/reference/commands) · [How it works](/guide/how-it-works)
