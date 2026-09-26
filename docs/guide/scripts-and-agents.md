# Scripts and AI agents

EASwitch works without a terminal, so shell scripts, CI helpers and AI coding agents can use it too.

```bash
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
  "error": null
}
```

| Field | Meaning |
|---|---|
| `current` | The account chosen with `easw use`, or `null` |
| `project` | The project's link (`account` and `file`), or `null` outside linked projects |
| `resolved` | The account easw would actually use here. `source` is `project` or `current` |
| `error` | Why no account can be used, when `resolved` is `null` |

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

## Behaviour without a terminal

- `easw add` needs `--token` or a piped token, and fails with a clear message otherwise, instead of waiting for input. Logging in needs a terminal.
- `easw use` needs an account name (the picker needs a terminal).
- Commands run through easw keep their exit code and stdout. easw's own status line goes to stderr.

See [exit codes](/reference/environment#exit-codes).

## AI coding assistants

If you're using an AI assistant to work on EASwitch itself, the repository's [AGENTS.md](https://github.com/iamgarriTech/easwitch/blob/main/AGENTS.md) gives it an overview of the codebase.
