import fs from "node:fs";
import path from "node:path";
import envPaths from "env-paths";
import { EaswError } from "./errors.js";

export interface AccountInfo {
  /** Expo username the token belongs to, captured when the account was added. */
  username?: string;
  addedAt: string;
}

export interface GlobalConfig {
  accounts: Record<string, AccountInfo>;
  current: string | null;
}

const NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;

export function assertValidName(name: string): void {
  if (!NAME_RE.test(name)) {
    throw new EaswError(
      `Invalid account name "${name}"`,
      "Use letters, numbers, dots, dashes or underscores (max 64 chars).",
    );
  }
}

export function configDir(): string {
  return process.env.EASWITCH_CONFIG_DIR ?? envPaths("easwitch", { suffix: "" }).config;
}

export function configPath(): string {
  return path.join(configDir(), "config.json");
}

export function loadConfig(): GlobalConfig {
  let raw: string;
  try {
    raw = fs.readFileSync(configPath(), "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return { accounts: {}, current: null };
    throw err;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<GlobalConfig>;
    return { accounts: parsed.accounts ?? {}, current: parsed.current ?? null };
  } catch {
    throw new EaswError(`Config file is not valid JSON: ${configPath()}`);
  }
}

export function saveConfig(cfg: GlobalConfig): void {
  const file = configPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Write-then-rename so a crash never leaves a half-written config.
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2) + "\n");
  fs.renameSync(tmp, file);
}
