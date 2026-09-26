---
layout: home

hero:
  name: EASwitch
  text: Multiple Expo accounts, one machine
  tagline: Save each Expo/EAS account once, then run EAS commands as the right one, without logging in and out.
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
  - title: Plain eas, if you want
    details: "<code>easw hook</code> makes plain <code>eas</code> use the linked account inside linked projects, in zsh, bash, fish, PowerShell and cmd."
---

## Quick start

```bash
npm install -g easwitch       # install (EAS CLI is included)

easw add personal             # save an account: log in, or paste an access token
easw add work

easw use work                 # choose which account easw uses
easw build --platform ios     # run any EAS command as that account

cd ~/code/acme-app
easw link work                # this project always uses "work"

easw hook                     # optional: make plain `eas` use the linked account too
easw shell-init               # optional: only show the hook code, to add it yourself
```

![EASwitch demo: listing accounts, adding one, switching, and building a linked project](./demo/demo.gif)

## Working at a company? An Acme example

Jane uses her personal Expo login for her own apps, a separate work user for Acme's app, and a client's token for freelance work. She saves each account once, links each project, and from then on every `easw` command in a project uses the right account. Her normal Expo login stays available elsewhere.

[Follow the Acme walkthrough](/guide/example-workflow) for the commands, the shell hook, common situations, and the difference between an Expo user and an Expo organization.
