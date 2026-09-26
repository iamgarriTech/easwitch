import fs from "node:fs";
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

/** Nearest .easwitch.json at or above `start`, like git finding .git. */
export function findProjectLink(start: string): ProjectLink | null {
  for (const dir of ancestors(start)) {
    const file = path.join(dir, PROJECT_FILE);
    if (!fs.existsSync(file)) continue;
    let account: unknown;
    try {
      account = (JSON.parse(fs.readFileSync(file, "utf8")) as { account?: unknown }).account;
    } catch {
      throw new EaswError(`${file} is not valid JSON`);
    }
    if (typeof account !== "string" || !account) {
      throw new EaswError(`${file} has no "account" field`, "Run `easw link <name>` to fix it.");
    }
    return { account, file };
  }
  return null;
}

/** Nearest directory that looks like an Expo/JS project root, falling back to `start`. */
export function findProjectRoot(start: string): string {
  for (const dir of ancestors(start)) {
    if (PROJECT_MARKERS.some((m) => fs.existsSync(path.join(dir, m)))) return dir;
  }
  return path.resolve(start);
}

export function writeProjectLink(dir: string, account: string): string {
  const file = path.join(dir, PROJECT_FILE);
  fs.writeFileSync(file, JSON.stringify({ account }, null, 2) + "\n");
  return file;
}

/**
 * Add .easwitch.json to `dir`/.gitignore if that file exists and doesn't list it.
 * Returns true when it was added.
 */
export function ensureGitignored(dir: string): boolean {
  const file = path.join(dir, ".gitignore");
  let contents: string;
  try {
    contents = fs.readFileSync(file, "utf8");
  } catch {
    return false;
  }
  const listed = contents.split(/\r?\n/).some((l) => [PROJECT_FILE, `/${PROJECT_FILE}`].includes(l.trim()));
  if (listed) return false;
  const sep = contents === "" || contents.endsWith("\n") ? "" : "\n";
  fs.appendFileSync(file, `${sep}${PROJECT_FILE}\n`);
  return true;
}
