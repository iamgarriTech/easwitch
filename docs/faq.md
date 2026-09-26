# FAQ

## Does this log me out of Expo?

No. EASwitch never runs `eas login` or `eas logout` against your normal session and never touches `~/.expo`.

## Should I log in or paste a token?

Logging in is quicker: EASwitch creates the token for you. Pasting a token gives you more control, for example to use a robot user's token from your organization's settings, which you can limit to specific permissions. Both are stored the same way.

## What happens to the token when I remove an account?

`easw remove` deletes it from your machine. A token EASwitch created by logging in stays valid on Expo until you revoke it in your [access token settings](https://expo.dev/settings/access-tokens). EASwitch reminds you when you remove the account.

## How do I know if a token stopped working?

Run `easw list --check`. Replace a broken token with `easw add <name> --force`.

## I already linked projects. Will turning on the hook conflict with that?

No. The order doesn't matter: the hook just looks for the project's `.easwitch.json`, so existing links work straight away. Running `easw hook` twice doesn't add the line twice.

## What's the difference between `easw hook` and `easw shell-init`?

`easw hook` sets up the shell hook for you. `easw shell-init` only shows the code, so you can add it to your shell settings yourself. See [Use plain eas](/guide/shell-hook#easw-hook-or-easw-shell-init).

## Can I use it in CI?

You don't need to. In CI, set `EXPO_TOKEN` as a secret and run `eas` directly. EASwitch is for developer machines with several accounts.

## Which EAS CLI version does it use?

Your global `eas` if one is on your `PATH`, otherwise the copy bundled with EASwitch. The status line says `bundled eas-cli <version>` when the bundled one runs. To use a specific version, install it globally: `npm install -g eas-cli@<version>`.

## Should I commit `.easwitch.json`?

Usually not, since account names are personal. That's why `easw link` adds it to `.gitignore`. If your whole team uses the same account names, committing it is fine.

## Is EASwitch made by Expo?

No. It's an independent open-source project that builds on EAS CLI. Issues and ideas are welcome on [GitHub](https://github.com/iamgarriTech/easwitch).
