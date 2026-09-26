# How it works

EAS CLI reads an `EXPO_TOKEN` environment variable and, when it's set, uses that token instead of your saved login. EASwitch builds on that. For every command, it:

1. works out which account to use (the project's link, then your current account),
2. reads that account's token from your system's credential store,
3. runs the command with `EXPO_TOKEN` set **for that one process only**.

Nothing is written to your shell, your Expo login (`~/.expo/state.json`), or your project's Expo config. The one exception is [`easw env`](/reference/commands#easw-env), which you run on purpose to set `EXPO_TOKEN` in a shell. When the command exits, its exit code is passed straight back, so `easw` works in scripts.

## Your normal login

EASwitch never runs `eas login` or `eas logout` against your normal session, and never touches `~/.expo`. `easw login` and `easw logout` are blocked for that reason. Plain `eas` keeps using your normal login, unless you turn on the [shell hook](/guide/shell-hook), and even then only inside linked projects.

## Where tokens are kept

Tokens live only in your operating system's credential store:

| System | Store |
|---|---|
| macOS | Keychain |
| Windows | Credential Manager |
| Linux | Secret Service (GNOME Keyring, KWallet) |

On Linux, a Secret Service provider must be running and unlocked. EASwitch won't store tokens in a plain file.

Config files only hold account names, usernames and dates. See [Environment and files](/reference/environment#files).

## Logging in

When you add an account by logging in, EASwitch:

1. runs EAS CLI's own `eas login` with its home folder pointed at a new temporary folder, so your real `~/.expo` session is never read or written,
2. uses that temporary session to create an access token on Expo, named `EASwitch: <name> on <your computer>`,
3. stores only that token in the credential store,
4. logs the temporary session out (which cancels it on Expo's servers) and deletes the folder, even if you press Ctrl+C.

You can see or revoke these tokens in your [access token settings](https://expo.dev/settings/access-tokens).

## Which EAS CLI runs

EASwitch uses your global `eas` if one is on your `PATH`, so `easw build` and `eas build` run the same version. If you don't have one, it uses the EAS CLI bundled with EASwitch, and the status line says `bundled eas-cli <version>`. Logging in always uses the bundled copy.
