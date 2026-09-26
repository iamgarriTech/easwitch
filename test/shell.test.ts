import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { envCode, installHook, shellInit, uninstallHook } from "../src/shell.js";

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "easw-shell-"));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("installHook / uninstallHook", () => {
  it("adds the hook once and removes it cleanly", () => {
    const file = path.join(tmp, ".zshrc");
    const original = "export FOO=1\nalias ll='ls -l'\n";
    fs.writeFileSync(file, original);

    expect(installHook("zsh", file)).toBe(true);
    expect(installHook("zsh", file)).toBe(false);
    const hooked = fs.readFileSync(file, "utf8");
    expect(hooked).toContain('eval "$(easw shell-init zsh)"');
    expect(hooked.startsWith(original)).toBe(true);

    expect(uninstallHook(file)).toBe(true);
    expect(fs.readFileSync(file, "utf8")).toBe(original);
    expect(uninstallHook(file)).toBe(false);
  });

  it("creates missing config files and directories", () => {
    const file = path.join(tmp, "fish", "config.fish");
    expect(installHook("fish", file)).toBe(true);
    expect(fs.readFileSync(file, "utf8")).toContain("easw shell-init fish | source");
    expect(uninstallHook(file)).toBe(true);
    expect(fs.readFileSync(file, "utf8")).toBe("");
  });

  it("doesn't add a second hook when one was added by hand", () => {
    const file = path.join(tmp, ".zshrc");
    fs.writeFileSync(file, 'eval "$(easw shell-init)"\n');
    expect(installHook("zsh", file)).toBe(false);
    expect(fs.readFileSync(file, "utf8")).toBe('eval "$(easw shell-init)"\n');
  });

  it("reports nothing to remove when the file doesn't exist", () => {
    expect(uninstallHook(path.join(tmp, "missing"))).toBe(false);
  });
});

describe("shellInit", () => {
  it("wraps eas for each shell", () => {
    expect(shellInit("zsh")).toContain('eas() { command easw eas "$@"; }');
    expect(shellInit("zsh")).toContain("export EASWITCH_HOOK=1");
    expect(shellInit("fish")).toContain("command easw eas $argv");
    expect(shellInit("fish")).toContain("set -gx EASWITCH_HOOK 1");
    expect(shellInit("powershell")).toContain("function eas { easw eas @args }");
    expect(shellInit("cmd")).toContain("@doskey eas=easw eas $*");
  });
});

describe("envCode", () => {
  it("quotes the token safely for each shell", () => {
    expect(envCode("bash", "a'b")).toBe("export EXPO_TOKEN='a'\\''b'\n");
    expect(envCode("fish", "a'b")).toBe("set -gx EXPO_TOKEN 'a\\'b'\n");
    expect(envCode("powershell", "a'b")).toBe("$env:EXPO_TOKEN = 'a''b'\n");
    expect(envCode("cmd", "abc")).toBe('set "EXPO_TOKEN=abc"\n');
  });

  it("clears the token with a null value", () => {
    expect(envCode("zsh", null)).toBe("unset EXPO_TOKEN\n");
    expect(envCode("fish", null)).toBe("set -e EXPO_TOKEN\n");
  });
});
