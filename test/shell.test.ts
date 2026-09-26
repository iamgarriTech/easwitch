import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installHook, shellInit, uninstallHook } from "../src/shell.js";

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

  it("reports nothing to remove when the file doesn't exist", () => {
    expect(uninstallHook(path.join(tmp, "missing"))).toBe(false);
  });
});

describe("shellInit", () => {
  it("wraps eas for each shell", () => {
    expect(shellInit("zsh")).toContain('eas() { command easw __shell-eas "$@"; }');
    expect(shellInit("fish")).toContain("command easw __shell-eas $argv");
    expect(shellInit("powershell")).toContain("function eas { easw __shell-eas @args }");
  });
});
