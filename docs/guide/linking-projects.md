# Linking projects

Linking pins a project to an account, so you never have to remember which account a project belongs to.

```bash
cd ~/code/acme-app
easw link client-acme
```

```text
✓ Project linked to "client-acme" (.easwitch.json)
  Added .easwitch.json to .gitignore, since account names are personal.
```

From then on, **every `easw` command in that project runs as `client-acme`**, in the project folder and all its subfolders, whatever account you've chosen with `easw use`:

```bash
easw whoami                       # client-acme's user
easw build --platform ios
easw update --branch production
easw submit --platform android
easw env:list
```

## Plain `eas` commands

Linking changes `easw` commands straight away. Plain `eas` commands follow the link only after you turn on the [shell hook](/guide/shell-hook) once:

| In a linked project | Without `easw hook` | After `easw hook` (once) |
|---|---|---|
| `easw whoami`, `easw build`, `easw update`… | ✅ linked account | ✅ linked account |
| `eas whoami`, `eas build`, `eas update`… | your normal login | ✅ linked account |

```bash
easw hook        # once; then open a new terminal
```

If the hook isn't set up yet, `easw link` asks whether to set it up:

```text
? Make plain `eas` commands use linked accounts too? (sets up `easw hook`) (Y/n)
```

Press Enter to set it up, or pass `--no-hook-prompt` to skip the question.

Not sure whether plain `eas` follows the link in your terminal? `easw current` tells you, and warns you when it doesn't.

For a full walkthrough, see [Example: working at Acme](/guide/example-workflow).

## Which account is used?

Every `easw` command picks an account in this order:

1. **The project's linked account.** EASwitch looks for a `.easwitch.json` in the current folder and its parents, like git looks for `.git`.
2. **The current account**, set with `easw use`.

Before running, EASwitch prints which account it picked, and why:

```text
› easw: using account "client-acme" (linked in .easwitch.json)
```

This line goes to stderr, so piping the command's output still works. When the bundled EAS CLI runs, the line also says `bundled eas-cli <version>`.

To see this without running anything, use `easw current`:

```text
Current EASwitch account: personal
This project is linked to: client-acme (/Users/jane/code/acme-app/.easwitch.json)
```

## A missing account never falls back

If a project is linked to an account you don't have (for example, after `easw remove`, or on a teammate's machine), the command stops with an error:

```text
✖ This project is linked to "client-acme", but that account doesn't exist in EASwitch
  Add it with `easw add client-acme`, or relink with `easw link <name>`.
```

It deliberately doesn't fall back to your current account, so you never build or publish under the wrong account by accident.

## The `.easwitch.json` file

`easw link` writes a small file at the project root:

```json
{
  "account": "client-acme"
}
```

- It contains only the account name, never a token.
- The project root is the nearest folder containing `eas.json`, `app.json`, `app.config.js`, `app.config.ts` or `package.json`.
- If the project has a `.gitignore`, EASwitch adds `.easwitch.json` to it, because account names are personal and your teammates may name theirs differently. If your whole team uses the same names, you can remove that line and commit the file.

## Unlinking

```bash
easw unlink
```

This removes the project's `.easwitch.json`, so easw goes back to using the current account there.
