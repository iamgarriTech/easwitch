# Environment and files

## Environment variables

| Variable | Effect |
|---|---|
| `EASWITCH_CONFIG_DIR` | Use this folder for EASwitch's config instead of the default. Handy for testing without touching your real accounts. |
| `EXPO_TOKEN` | If it's already set in your shell, EASwitch overrides it for the commands it runs, and prints a warning. |
| `NO_COLOR` | Turn off colored output. |

## Files

| What | Where | Contains |
|---|---|---|
| Access tokens | OS credential store (macOS Keychain, Windows Credential Manager, Linux Secret Service), under the service name `easwitch` | One token per account |
| Account list | `config.json` in your OS config folder: `~/Library/Preferences/easwitch/` on macOS, `%APPDATA%\easwitch\Config\` on Windows, `~/.config/easwitch/` on Linux | Account names, Expo usernames, dates, the current account. No tokens. |
| Project link | `.easwitch.json` in the project root | The linked account's name. No tokens. |
| Shell hook | Your shell's startup file (see [supported shells](/guide/shell-hook#supported-shells)); for Command Prompt, `cmd-hook.cmd` in EASwitch's config folder plus an AutoRun entry | One marked line calling `easw shell-init` |

## Exit codes

| Code | When |
|---|---|
| The command's own code | Any command run through easw (`easw build`, `easw exec …`, plain `eas` with the hook) returns exactly what that command returned. |
| `0` | An easw command succeeded. |
| `1` | An easw error (for example, no account selected, or an unknown account), or `easw list --check` found an invalid token. |
| `130` | You pressed Ctrl+C at a prompt. |
