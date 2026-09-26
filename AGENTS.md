# AGENTS.md

Guidance for AI coding agents working in this repository. Human contributors: see [CONTRIBUTING.md](CONTRIBUTING.md).

## What this project is

EASwitch (`easw` / `easwitch`) is a Node.js CLI, published on npm as `easwitch`, that lets developers keep several Expo/EAS accounts on one machine and run EAS CLI commands as any of them without logging in and out.

It works by running `eas` (or any command, via `easw exec`) with the chosen account's access token in the `EXPO_TOKEN` environment variable **for that child process only**. EAS CLI prefers `EXPO_TOKEN` over the saved session in `~/.expo/state.json`, which EASwitch never reads or writes. Plain `eas` commands therefore keep using the developer's normal login.

## Commands

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest unit tests (test/)
npm run build       # tsup -> dist/cli.js
npm run smoke       # runs the built dist/cli.js end to end against the real OS credential store (build first)
```

Always run typecheck, tests, build and smoke before proposing a change; CI runs the same on macOS, Windows and Linux (Node 20 and 22).

Set `EASWITCH_CONFIG_DIR` to a temp directory when running the CLI by hand so you don't touch the developer's real accounts. The smoke test does this itself and deletes the credential store entries it creates.

## Layout

| Path | Responsibility |
|---|---|
| `src/cli.ts` | Commander program: `add`, `list`, `use`, `current`, `remove`, `link`, `unlink`, `exec`; entry point and error printing |
| `src/route.ts` | Decides whether argv is an easw command, `exec`, a blocked command (`login`/`logout`), or forwarded to `eas` |
| `src/resolve.ts` | Account resolution: nearest `.easwitch.json` link, then the current account |
| `src/run.ts` | Spawns the child with `EXPO_TOKEN`; passes the exit code through; `whoamiForToken` validates tokens |
| `src/eas.ts` | Finds EAS CLI: global `eas` on `PATH` first, otherwise the bundled `eas-cli` dependency run with `process.execPath` |
| `src/login.ts` | `easw add --login`: runs the bundled `eas login` with `HOME`/`USERPROFILE` set to a temp dir, uses that temporary session to create an access token via Expo's GraphQL API, then logs it out and deletes the dir |
| `src/shell.ts` | Shell hook: `easw hook`/`unhook` (edit the shell's config file between a marker comment), `easw shell-init` scripts (zsh/bash/fish/PowerShell/cmd; cmd uses a doskey macro loaded via the AutoRun registry value), and `runShellEas`, which the hook calls through the hidden `__shell-eas` subcommand |
| `src/tokens.ts` | OS credential store via `@napi-rs/keyring` (service `easwitch`, account = profile name) |
| `src/config.ts` | Global `config.json` (`{ accounts, current }`, no tokens) in the OS config dir |
| `src/project.ts` | `.easwitch.json` lookup (walks up like `.git`), project root detection, `.gitignore` update |
| `test/` | Unit tests for routing and resolution |
| `scripts/smoke.mjs` | End-to-end test of the built CLI |
| `docs/` | VitePress docs site (`npm run docs:build`), deployed to GitHub Pages; keep it in sync with the README |

## Current design decisions

These describe how the tool behaves today. Changing any of them is possible, but it's a behaviour change: call it out in the PR description and README.

- Tokens are stored only in the OS credential store, never in config files, output or logs.
- `EXPO_TOKEN` is set only in the spawned child's environment.
- Plain `eas` uses the normal login unless the user installs the opt-in `easw shell-init` hook. With it, plain `eas` uses the linked account only inside linked projects, and `login`/`logout` still go to the normal session.
- `easw add --login` never touches the real `~/.expo`: the temporary session lives in a throwaway home directory and is logged out and deleted afterwards. Only the resulting access token is kept, in the credential store.
- `easw login`, `logout`, `account:login` and `account:logout` are blocked because they would write the normal Expo session.
- If a project links to an account that doesn't exist, commands fail rather than falling back to the current account.
- easw's own status output goes to stderr so the wrapped command's stdout stays pipeable.
- User-facing failures throw `EaswError(message, hint)`, which prints without a stack trace.

## Conventions

- TypeScript strict, ES modules, Node `^20.18.3 || >=22`. Match the surrounding style; comments explain *why*.
- Use `cross-spawn` for child processes (Windows `.cmd` shims).
- Keep commits and PRs focused. PRs are squash-merged into a protected `main` and need CI to pass on all platforms.
- For user-visible changes, update `README.md`, the matching page in `docs/`, and add an entry under **Unreleased** in `CHANGELOG.md`.

## Using easw from an agent

If you're operating the CLI rather than editing it:

- `easw current --json` shows which account easw would use in the current directory and why (`resolved.source` is `project` or `current`).
- `easw list --json` lists accounts, marking the current and linked ones. Add `--check` to test each token with Expo (adds `valid`/`error`; exits 1 if any are invalid).
- `easw add <name>` needs a token: pass `--token` or pipe it on stdin. Without a terminal and no token, it fails instead of prompting.
- Exit codes of wrapped commands are passed through unchanged.
