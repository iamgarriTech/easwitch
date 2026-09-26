# Use plain `eas` (shell hook)

By default, plain `eas` always uses your normal Expo login, and only `easw` commands switch accounts. If you'd rather type `eas` everywhere, turn on the shell hook:

```bash
easw hook
```

Then open a new terminal. Inside projects you've linked with `easw link`, plain `eas` now runs as the linked account. Everywhere else, it's your normal `eas`.

```text
$ cd ~/code/acme-app       # linked to client-acme
$ eas build --platform ios
› easw: using account "client-acme" (linked in .easwitch.json)
...
$ cd ~ && eas whoami       # not a linked project
jane
```

- The `› easw:` line shows whenever plain `eas` is running as a linked account.
- `eas login` and `eas logout` always go to your normal session.
- If you don't have EAS CLI installed globally, plain `eas` uses the copy bundled with EASwitch.
- The hook applies to interactive terminals. Scripts should call `easw` directly.
- It doesn't matter whether you link projects before or after turning on the hook.

To turn it off, run `easw unhook` and open a new terminal.

## `easw hook` or `easw shell-init`?

Both turn on the same thing. The difference is who sets it up:

- **`easw hook` sets it up for you.** Run it once, open a new terminal, and you're done.
- **`easw shell-init` only shows you the code.** You copy it into your shell settings yourself.

If you're not sure, use `easw hook`.

## Supported shells

| Shell | Where `easw hook` adds the hook |
|---|---|
| zsh | `~/.zshrc` |
| bash | `~/.bash_profile` on macOS, `~/.bashrc` on Linux |
| fish | `~/.config/fish/config.fish` |
| PowerShell | Your PowerShell profile (`$PROFILE`) |
| Command Prompt (cmd) | A `doskey` macro, loaded through cmd's AutoRun setting (`HKCU\Software\Microsoft\Command Processor`). Any AutoRun command you already have is kept. |

EASwitch detects your shell automatically. To choose one, name it: `easw hook fish`. On Windows, `easw hook` sets up both PowerShell and Command Prompt.

Running `easw hook` again doesn't add a second copy, including when you added the line yourself.

## Setting it up yourself

If you'd rather edit your config by hand, add the line for your shell instead of running `easw hook`:

| Shell | Add this line |
|---|---|
| zsh (`~/.zshrc`), bash (`~/.bashrc`) | `eval "$(easw shell-init)"` |
| fish (`config.fish`) | `easw shell-init fish \| source` |
| PowerShell (`$PROFILE`) | `easw shell-init powershell \| Out-String \| Invoke-Expression` |
| Command Prompt | `doskey eas=easw __shell-eas $*` in a script run by AutoRun |

## What the hook does

The hook is a tiny shell function named `eas` that calls `easw eas` with your arguments. `easw eas` then checks for a `.easwitch.json`:

- **Found:** it runs `eas` as the linked account, exactly like `easw` would.
- **Not found**, or you're running `eas login` / `eas logout`: it runs your normal `eas`, unchanged.

You can run `easw eas` yourself too, for example in scripts or CI, to get the same behaviour without the hook. See [`easw eas`](/reference/commands#easw-eas).

The hook also sets `EASWITCH_HOOK=1` in the terminal. That's how `easw current` knows whether plain `eas` follows links in the terminal you're using.

## Is the hook working?

Run `easw current` inside a linked project:

| It says | Meaning |
|---|---|
| "Plain eas here uses it too (the shell hook is active)" | All good. |
| "⚠ … the shell hook is set up, but this terminal hasn't loaded it" | You set up the hook after opening this terminal. Open a new one. |
| "⚠ Plain eas here still uses your normal Expo login … Run easw hook" | The hook isn't set up. Run `easw hook`, or type `easw` instead of `eas`. |
