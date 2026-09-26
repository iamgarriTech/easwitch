# EASwitch

Manage multiple Expo/EAS accounts on one machine without touching your normal `eas login`.

```bash
easw add work            # prompts for an Expo access token
easw use work
easw build --platform ios   # runs `eas build` as "work"
eas whoami               # still your normal login
```

Link a project so it always uses a specific account:

```bash
cd company-app && easw link work
```

Create access tokens at <https://expo.dev/settings/access-tokens>. Tokens are stored in the OS credential store (Keychain, Credential Manager, Secret Service), never in config files.

See [PRD.md](PRD.md) for the full spec.

## Development

```bash
npm install
npm run build        # bundle to dist/
npm link             # put `easw` / `easwitch` on your PATH
npm test
npm run typecheck
npm run smoke        # end-to-end check against your real credential store (cleans up after itself)
```

Set `EASWITCH_CONFIG_DIR` to use a throwaway config directory while testing.
