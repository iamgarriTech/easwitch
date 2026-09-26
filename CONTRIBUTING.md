# Contributing to EASwitch

Thanks for helping out! Bug reports, fixes, docs and ideas are all welcome.

## Ground rules

- **EASwitch is a layer on top of EAS CLI, not a replacement.** It picks an account and runs `eas` with that account's token. Features that reimplement EAS CLI behaviour are out of scope.
- **Never touch the user's normal Expo login.** Nothing may write to `~/.expo/state.json`, run `eas login`/`eas logout`, or leave `EXPO_TOKEN` set outside the child process.
- **Tokens only live in the OS credential store.** Never write them to config files, logs, error messages or test fixtures.
- **Cross-platform matters.** Changes must work on macOS, Windows and Linux; CI checks all three.

## Before you start

- For bugs, [open an issue](https://github.com/iamgarriTech/easwitch/issues/new/choose) first unless the fix is small and obvious.
- For new features or behaviour changes, open an issue to discuss it before writing code, so your time isn't wasted on something that can't be merged.
- Security problems: **don't open a public issue.** See [SECURITY.md](SECURITY.md).

## Development setup

Requires Node.js 20.18+ or 22+.

```bash
git clone https://github.com/iamgarriTech/easwitch.git
cd easwitch
npm install
npm run build
npm link          # puts your local `easw` on PATH
```

Use a throwaway config directory so you don't disturb your real accounts:

```bash
export EASWITCH_CONFIG_DIR=/tmp/easw-dev
```

### Checks

Run all of these before opening a PR; CI runs the same ones.

```bash
npm run typecheck
npm test          # unit tests (vitest)
npm run build
npm run smoke     # end-to-end run against your real credential store; cleans up after itself
```

### Project layout

| Path | What's there |
|---|---|
| `src/cli.ts` | Command definitions and entry point |
| `src/route.ts` | Decides whether a command is easw's own, `exec`, or forwarded to eas |
| `src/resolve.ts` | Account resolution (project link, then current account) |
| `src/run.ts` | Runs a command with the account's `EXPO_TOKEN` |
| `src/eas.ts` | Finds EAS CLI: global `eas` first, then the bundled copy |
| `src/tokens.ts` | OS credential store access |
| `src/config.ts`, `src/project.ts` | Global config and `.easwitch.json` handling |
| `test/` | Unit tests |
| `scripts/smoke.mjs` | End-to-end test of the built CLI |

## Pull requests

1. Fork the repo and create a branch from `main` (e.g. `fix/link-windows-paths`).
2. Keep each PR focused on one change. Unrelated cleanups go in their own PR.
3. Add or update tests for behaviour changes.
4. Update the README if you change commands, options or behaviour users can see.
5. Add a line under **Unreleased** in [CHANGELOG.md](CHANGELOG.md) for anything user-facing.
6. Open the PR and fill in the template. CI must pass on all platforms before merging.

PRs are squash-merged, so the PR title becomes the commit message. Use a short imperative title, optionally with a [Conventional Commits](https://www.conventionalcommits.org/) prefix: `fix: resolve links from nested folders`, `feat: add --json to list`.

### Code style

- TypeScript, strict mode, ES modules.
- Match the surrounding code; keep functions small and comments for the *why*.
- User-facing errors throw `EaswError(message, hint)` so they print cleanly without a stack trace.
- Status output from easw itself goes to stderr, so the wrapped command's stdout stays pipeable.

## Releasing (maintainers)

1. Move **Unreleased** entries in `CHANGELOG.md` under a new version heading.
2. `npm version <patch|minor|major>`. This bumps `package.json` and creates a `vX.Y.Z` tag.
3. `npm publish`. It runs typecheck, tests and build first.
4. `git push --follow-tags`, then create a GitHub release from the tag with the changelog entry.

## Code of conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By taking part, you agree to uphold it.
