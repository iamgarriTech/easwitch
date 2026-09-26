#!/usr/bin/env bash
# Re-records docs/demo/demo.gif with throwaway demo accounts.
# Needs vhs (https://github.com/charmbracelet/vhs) and a built CLI (npm run build).
# The demo uses a stand-in `eas` (fake-eas), so no real Expo accounts or tokens are involved.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/../.." && pwd)"
work="$(mktemp -d)"
export EASWITCH_CONFIG_DIR="$work/config"
# `easw link` offers to set up the shell hook. Point zsh's config folder somewhere other than
# your real ~/.zshrc: ~/.config/zsh reads nicely on screen, but only if it doesn't exist yet
# (it's created for the recording and removed afterwards); otherwise a temp dir.
export SHELL=/bin/zsh
if [ ! -e "$HOME/.config/zsh" ]; then
  [ -e "$HOME/.config" ] || created_config=1
  export ZDOTDIR="$HOME/.config/zsh"
  created_zdotdir=1
else
  export ZDOTDIR="$work/zdot"
fi
mkdir -p "$ZDOTDIR" && touch "$ZDOTDIR/.zshrc"

easw() { node "$repo/dist/cli.js" "$@"; }
cleanup() {
  for name in personal work client-acme; do easw remove "$name" >/dev/null 2>&1 || true; done
  rm -rf "$work"
  if [ -n "${created_zdotdir:-}" ]; then rm -rf "$ZDOTDIR"; fi
  if [ -n "${created_config:-}" ]; then rmdir "$HOME/.config" 2>/dev/null || true; fi
}
trap cleanup EXIT

# `easw` and the stand-in `eas` on PATH for the recording.
mkdir -p "$work/bin" "$work/acme-app"
printf '#!/usr/bin/env bash\nexec node "%s/dist/cli.js" "$@"\n' "$repo" > "$work/bin/easw"
cp "$here/fake-eas" "$work/bin/eas"
chmod +x "$work/bin/easw" "$work/bin/eas"
echo '{}' > "$work/acme-app/app.json"
export PATH="$work/bin:$PATH"

easw add personal --token demo-personal >/dev/null
easw add work --token demo-work >/dev/null
easw use personal >/dev/null

(cd "$work" && vhs "$here/demo.tape")
mv "$work/demo.gif" "$here/demo.gif"
echo "Wrote $here/demo.gif"
