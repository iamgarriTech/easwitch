# Scripts and AI agents

EASwitch works without a terminal, so shell scripts, CI helpers and AI coding agents can use it too.

```bash
easw eas build --platform ios   # like the shell hook: linked account in linked projects, normal login elsewhere
eval "$(easw env)"    # set EXPO_TOKEN in this script to the account easw would use here
easw current --json   # which account easw would use here, and why
easw list --json      # all accounts, marking the current and linked ones
easw list --check     # test every token with Expo; exits 1 if any are invalid
echo "$TOKEN" | easw add work   # add an account non-interactively
```

## `easw current --json`

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

| Field | Meaning |
|---|---|
| `current` | The account chosen with `easw use`, or `null` |
| `project` | The project's link (`account` and `file`), or `null` outside linked projects |
| `resolved` | The account easw would actually use here. `source` is `project` or `current` |
| `error` | Why no account can be used, when `resolved` is `null` |
| `hook.installed` | Whether the shell hook is in the shell's config |
| `hook.active` | Whether the hook is loaded in this shell (plain `eas` goes through EASwitch) |
| `plainEasFollowsLink` | Whether plain `eas` uses the linked account here; `null` outside linked projects |

## `easw list --json`

```json
{
  "current": "work",
  "accounts": [
    { "name": "personal", "username": "jane", "current": false, "linked": false },
    { "name": "work", "username": "jane-acme", "current": true, "linked": true }
  ]
}
```

With `--check`, each account also has `valid` (true or false) and `error` (why the token was rejected, or `null`).

## `easw eas`: a stable entry point for scripts and CI

`easw eas <args>` runs EAS CLI the way the shell hook does, without depending on anyone's shell setup: the linked account inside linked projects, the normal login everywhere else.

```bash
easw eas build --platform ios --non-interactive
```

Use `easw build` instead if the command must use an EASwitch account (it fails when there isn't one), and plain `eas` with an `EXPO_TOKEN` secret in CI that doesn't use EASwitch at all.

## `easw env`: adopt the account in one line

```bash
eval "$(easw env)"          # EXPO_TOKEN now holds the linked (or current) account's token
./scripts/release.sh        # anything that reads EXPO_TOKEN uses that account
eval "$(easw env --unset)"
```

`easw env fish`, `easw env powershell` and `easw env cmd` print the equivalent for those shells. The token stays set in that shell until it exits or you unset it. `easw env` won't print the token straight into a terminal, only into a pipe like `eval "$(…)"`.

## Behaviour without a terminal

- `easw add` needs `--token` or a piped token, and fails with a clear message otherwise, instead of waiting for input. Logging in needs a terminal.
- `easw use` needs an account name (the picker needs a terminal).
- Commands run through easw keep their exit code and stdout. easw's own status line goes to stderr.

See [exit codes](/reference/environment#exit-codes).

## AI coding assistants

If you're using an AI assistant to work on EASwitch itself, the repository's [AGENTS.md](https://github.com/iamgarriTech/easwitch/blob/main/AGENTS.md) gives it an overview of the codebase.
