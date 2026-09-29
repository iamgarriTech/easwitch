import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EaswError } from "./errors.js";

export const PROJECT_FILE = ".easwitch.json";

const PROJECT_MARKERS = ["eas.json", "app.json", "app.config.js", "app.config.ts", "package.json"];

export interface ProjectLink {
  account: string;
  /** Absolute path of the .easwitch.json that holds the link. */
  file: string;
}

function* ancestors(start: string): Generator<string> {
  let dir = path.resolve(start);
  while (true) {
    yield dir;
    const parent = path.dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

const isGitRoot = (dir: string) => fs.existsSync(path.join(dir, ".git"));

/** Path of the nearest .easwitch.json at or above `start`, whether or not it's valid. */
export function findProjectLinkFile(start: string): string | null {
  for (const dir of ancestors(start)) {
    const file = path.join(dir, PROJECT_FILE);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

/** Read the account out of a .easwitch.json, with an error that says what's wrong with it. */
export function readProjectLink(file: string): ProjectLink {
  const fix = "Fix it with `easw link <name>`, or remove it with `easw unlink`.";
  let raw: string;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EISDIR") throw new EaswError(`${file} is a folder, not an EASwitch link file`, "Rename or remove it.");
    throw new EaswError(`Couldn't read ${file}: ${code ?? (err as Error).message}`);
  }
  let parsed: unknown;
  try {
    // Some Windows editors save UTF-8 with a byte order mark, which JSON.parse rejects.
    parsed = JSON.parse(raw.replace(/^﻿/, ""));
  } catch {
    throw new EaswError(`${file} is not valid JSON`, fix);
  }
  const account = parsed && typeof parsed === "object" ? (parsed as { account?: unknown }).account : undefined;
  if (typeof account !== "string" || !account) {
    throw new EaswError(`${file} has no "account" field`, fix);
  }
  return { account, file };
}

/** Nearest .easwitch.json at or above `start`, like git finding .git. */
export function findProjectLink(start: string): ProjectLink | null {
  const file = findProjectLinkFile(start);
  return file ? readProjectLink(file) : null;
}

/**
 * Nearest directory that looks like an Expo/JS project root, falling back to `start`.
 * Doesn't look past the git repository root, and never picks the home folder or above
 * it (a stray ~/package.json would otherwise link every project under it).
 */
export function findProjectRoot(start: string, home = os.homedir()): string {
  const containsHome = (dir: string) => {
    const rel = path.relative(dir, home);
    return !rel.startsWith("..") && !path.isAbsolute(rel);
  };
  for (const dir of ancestors(start)) {
    if (containsHome(dir)) break;
    if (PROJECT_MARKERS.some((m) => fs.existsSync(path.join(dir, m)))) return dir;
    if (isGitRoot(dir)) break;
  }
  return path.resolve(start);
}

export function writeProjectLink(dir: string, account: string): string {
  const file = path.join(dir, PROJECT_FILE);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    throw new EaswError(`${file} is a folder, not an EASwitch link file`, "Rename or remove it, then link again.");
  }
  fs.writeFileSync(file, JSON.stringify({ account }, null, 2) + "\n");
  return file;
}

/**
 * Make sure git ignores `dir`/.easwitch.json: add it to the nearest .gitignore between
 * `dir` and the repository root (monorepos often only have one at the root). Outside a
 * repository only `dir`/.gitignore counts. Returns the .gitignore it added to, or null.
 */
export function ensureGitignored(dir: string): string | null {
  const root = path.resolve(dir);
  const dirs: string[] = [];
  for (const d of ancestors(root)) {
    dirs.push(d);
    if (isGitRoot(d)) break;
  }
  const searched = isGitRoot(dirs[dirs.length - 1]) ? dirs : [root];
  const file = searched.map((d) => path.join(d, ".gitignore")).find((f) => fs.existsSync(f));
  if (!file) return null;
  const contents = fs.readFileSync(file, "utf8");
  const atRoot = path.dirname(file) === root;
  const listed = contents
    .split(/\r?\n/)
    .map((l) => l.trim())
    .some((l) => l === PROJECT_FILE || l === `**/${PROJECT_FILE}` || (atRoot && l === `/${PROJECT_FILE}`));
  if (listed) return null;
  const sep = contents === "" || contents.endsWith("\n") ? "" : "\n";
  fs.appendFileSync(file, `${sep}${PROJECT_FILE}\n`);
  return file;
}
