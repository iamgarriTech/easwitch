import { createHash } from "node:crypto";
import path from "node:path";
import { AsyncEntry } from "@napi-rs/keyring";
import { EaswError } from "./errors.js";

/**
 * Credential store service name. A custom EASWITCH_CONFIG_DIR (tests, demos) gets its own
 * service, so a throwaway account named "personal" can never overwrite or delete the real one.
 */
export function tokenService(): string {
  const dir = process.env.EASWITCH_CONFIG_DIR;
  if (!dir) return "easwitch";
  return `easwitch:${createHash("sha256").update(path.resolve(dir)).digest("hex").slice(0, 12)}`;
}

function keychainError(err: unknown): EaswError {
  const detail = err instanceof Error ? err.message : String(err);
  return new EaswError(
    `Could not access the system credential store: ${detail}`,
    process.platform === "linux"
      ? "EASwitch needs a Secret Service provider (e.g. gnome-keyring or KWallet) running and unlocked."
      : undefined,
  );
}

export async function setToken(account: string, token: string): Promise<void> {
  try {
    await new AsyncEntry(tokenService(), account).setPassword(token);
  } catch (err) {
    throw keychainError(err);
  }
}

export async function getToken(account: string): Promise<string | undefined> {
  try {
    return await new AsyncEntry(tokenService(), account).getPassword();
  } catch (err) {
    throw keychainError(err);
  }
}

export async function deleteToken(account: string): Promise<boolean> {
  try {
    return await new AsyncEntry(tokenService(), account).deleteCredential();
  } catch (err) {
    throw keychainError(err);
  }
}
