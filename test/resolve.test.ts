import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GlobalConfig } from "../src/config.js";
import { ensureGitignored, findProjectRoot, writeProjectLink } from "../src/project.js";
import { resolveAccount } from "../src/resolve.js";

let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "easw-"));
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

const cfg = (current: string | null, ...names: string[]): GlobalConfig => ({
  current,
  accounts: Object.fromEntries(names.map((n) => [n, { addedAt: "" }])),
});

describe("resolveAccount", () => {
  it("uses the current account outside a linked project", () => {
    expect(resolveAccount(cfg("personal", "personal", "work"), tmp)).toEqual({
      name: "personal",
      source: "current",
    });
  });

  it("prefers the project link, including from subdirectories", () => {
    const file = writeProjectLink(tmp, "work");
    const nested = path.join(tmp, "src", "screens");
    fs.mkdirSync(nested, { recursive: true });
    expect(resolveAccount(cfg("personal", "personal", "work"), nested)).toEqual({
      name: "work",
      source: "project",
      linkFile: file,
    });
  });

  it("refuses to fall back when the linked account is missing", () => {
    writeProjectLink(tmp, "client");
    expect(() => resolveAccount(cfg("personal", "personal"), tmp)).toThrow(/linked to "client"/);
  });

  it("errors when nothing is selected", () => {
    expect(() => resolveAccount(cfg(null), tmp)).toThrow(/No EASwitch account selected/);
    expect(() => resolveAccount(cfg(null, "work"), tmp)).toThrow(/No EASwitch account selected/);
  });

  it("rejects a malformed link file", () => {
    fs.writeFileSync(path.join(tmp, ".easwitch.json"), "{nope");
    expect(() => resolveAccount(cfg("personal", "personal"), tmp)).toThrow(/not valid JSON/);
  });
});

describe("findProjectRoot", () => {
  it("finds the nearest project marker", () => {
    fs.writeFileSync(path.join(tmp, "app.json"), "{}");
    const nested = path.join(tmp, "a", "b");
    fs.mkdirSync(nested, { recursive: true });
    expect(findProjectRoot(nested)).toBe(tmp);
  });
});

describe("ensureGitignored", () => {
  it("appends once to an existing .gitignore and skips when there is none", () => {
    expect(ensureGitignored(tmp)).toBe(false);
    fs.writeFileSync(path.join(tmp, ".gitignore"), "node_modules");
    expect(ensureGitignored(tmp)).toBe(true);
    expect(ensureGitignored(tmp)).toBe(false);
    expect(fs.readFileSync(path.join(tmp, ".gitignore"), "utf8")).toBe("node_modules\n.easwitch.json\n");
  });
});
