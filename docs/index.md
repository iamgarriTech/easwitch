---
layout: home

hero:
  name: EASwitch
  text: Multiple Expo accounts, one machine
  tagline: Keep typing eas. Save each Expo account once, link each project, and every eas command uses the right account, without logging in and out.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: See an example
      link: /guide/example-workflow
    - theme: alt
      text: Command reference
      link: /reference/commands
    - theme: alt
      text: GitHub
      link: https://github.com/iamgarriTech/easwitch

features:
  - title: Your normal login stays put
    details: "<code>eas build</code>, <code>eas whoami</code> and <code>expo start</code> keep working exactly as before. Only <code>easw</code> commands switch accounts."
  - title: Per-project accounts
    details: "<code>easw link</code> pins a project to an account. Every <code>easw</code> command in it, from <code>easw whoami</code> to <code>easw submit</code>, then runs as that account."
  - title: Any EAS command
    details: "<code>easw build</code>, <code>easw update</code>, <code>easw submit</code>, <code>easw env:list</code>… every EAS CLI command runs as the selected account."
  - title: Tokens in your keychain
    details: Access tokens live in macOS Keychain, Windows Credential Manager or Linux Secret Service. Never in config files.
  - title: Log in or paste a token
    details: Add accounts with Expo's own login (browser, password or SSO) or an access token. EAS CLI comes bundled.
  - title: Keep typing eas
    details: "Run <code>easw hook</code> once, and plain <code>eas</code> uses the linked account inside linked projects. Works in zsh, bash, fish, PowerShell and cmd."
---

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

![EASwitch demo: linking a project, turning on the shell hook, then using plain eas as the linked account](./demo/demo.gif)

## Working at a company? An Acme example

Jane uses her personal Expo login for her own apps, a separate work user for Acme's app, and a client's token for freelance work. She saves each account once, links each project, and from then on every `easw` command in a project uses the right account. Her normal Expo login stays available elsewhere.

[Follow the Acme walkthrough](/guide/example-workflow) for the commands, the shell hook, common situations, and the difference between an Expo user and an Expo organization.
