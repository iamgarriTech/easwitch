# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Any eas command can run as the selected account (`easw env:list`, `easw build:list`, `easw credentials`, …). `login` and `logout` are blocked.
- EAS CLI is bundled, so a separate install isn't needed. A global `eas` on `PATH` is still preferred when present.
- `easw link` adds `.easwitch.json` to an existing `.gitignore`.

### Changed

- `easw --help` lists only easw's own commands.
- Requires Node.js 20.18.3+ or 22+ (matching EAS CLI).

## [0.1.0] - 2026-09-26

### Added

- Account profiles with tokens stored in the OS credential store.
- `add`, `list`, `use`, `current`, `remove`, `link`, `unlink`, `exec`.
- `build`, `update`, `submit` and `whoami` run as the resolved account.

[Unreleased]: https://github.com/iamgarriTech/easwitch/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/iamgarriTech/easwitch/releases/tag/v0.1.0
