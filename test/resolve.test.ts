import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GlobalConfig } from "../src/config.js";
import { ensureGitignored, findProjectLink, findProjectLinkFile, findProjectRoot, writeProjectLink } from "../src/project.js";
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

describe("findProjectLink", () => {
  const linkFile = () => path.join(tmp, ".easwitch.json");

  it("accepts a file saved with a UTF-8 byte order mark", () => {
    fs.writeFileSync(linkFile(), '\uFEFF{"account":"work"}');
    expect(findProjectLink(tmp)).toEqual({ account: "work", file: linkFile() });
  });

  it("says what's wrong with a link file that isn't an object with an account", () => {
    for (const contents of ["null", '"work"', "[]", '{"account":""}']) {
      fs.writeFileSync(linkFile(), contents);
      expect(() => findProjectLink(tmp)).toThrow(/has no "account" field/);
    }
  });

  it("reports a folder named .easwitch.json as a folder", () => {
    fs.mkdirSync(linkFile());
    expect(() => findProjectLink(tmp)).toThrow(/is a folder/);
    expect(() => writeProjectLink(tmp, "work")).toThrow(/is a folder/);
  });

  it("still finds a broken link file's path, so unlink can remove it", () => {
    fs.writeFileSync(linkFile(), "{nope");
    const nested = path.join(tmp, "src");
    fs.mkdirSync(nested);
    expect(findProjectLinkFile(nested)).toBe(linkFile());
  });
});

describe("findProjectRoot", () => {
  it("finds the nearest project marker", () => {
    fs.writeFileSync(path.join(tmp, "app.json"), "{}");
    const nested = path.join(tmp, "a", "b");
    fs.mkdirSync(nested, { recursive: true });
    expect(findProjectRoot(nested)).toBe(tmp);
  });

  it("never picks the home folder or above it", () => {
    const home = path.join(tmp, "home");
    const dir = path.join(home, "scratch", "notes");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(home, "package.json"), "{}");
    fs.writeFileSync(path.join(tmp, "package.json"), "{}");
    expect(findProjectRoot(dir, home)).toBe(dir);
    expect(findProjectRoot(home, home)).toBe(home);
  });

  it("doesn't look past the git repository root", () => {
    fs.writeFileSync(path.join(tmp, "package.json"), "{}");
    const repo = path.join(tmp, "repo");
    const dir = path.join(repo, "tools");
    fs.mkdirSync(path.join(repo, ".git"), { recursive: true });
    fs.mkdirSync(dir);
    expect(findProjectRoot(dir, path.join(tmp, "home"))).toBe(dir);
  });
});

describe("ensureGitignored", () => {
  it("appends once to an existing .gitignore and skips when there is none", () => {
    expect(ensureGitignored(tmp)).toBe(null);
    const file = path.join(tmp, ".gitignore");
    fs.writeFileSync(file, "node_modules");
    expect(ensureGitignored(tmp)).toBe(file);
    expect(ensureGitignored(tmp)).toBe(null);
    expect(fs.readFileSync(file, "utf8")).toBe("node_modules\n.easwitch.json\n");
  });

  it("uses the repository root's .gitignore for a package in a monorepo", () => {
    fs.mkdirSync(path.join(tmp, ".git"));
    const file = path.join(tmp, ".gitignore");
    fs.writeFileSync(file, "node_modules\n");
    const app = path.join(tmp, "apps", "mobile");
    fs.mkdirSync(app, { recursive: true });
    expect(ensureGitignored(app)).toBe(file);
    expect(fs.readFileSync(file, "utf8")).toBe("node_modules\n.easwitch.json\n");
    // An anchored entry at the root only covers the root's own file.
    fs.writeFileSync(file, "/.easwitch.json\n");
    expect(ensureGitignored(app)).toBe(file);
  });

  it("doesn't use a .gitignore above the project outside a repository", () => {
    fs.writeFileSync(path.join(tmp, ".gitignore"), "node_modules\n");
    const app = path.join(tmp, "app");
    fs.mkdirSync(app);
    expect(ensureGitignored(app)).toBe(null);
  });
});
