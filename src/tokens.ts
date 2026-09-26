import { AsyncEntry } from "@napi-rs/keyring";
import { EaswError } from "./errors.js";

const SERVICE = "easwitch";

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
    await new AsyncEntry(SERVICE, account).setPassword(token);
  } catch (err) {
    throw keychainError(err);
  }
}

export async function getToken(account: string): Promise<string | undefined> {
  try {
    return await new AsyncEntry(SERVICE, account).getPassword();
  } catch (err) {
    throw keychainError(err);
  }
}

export async function deleteToken(account: string): Promise<boolean> {
  try {
    return await new AsyncEntry(SERVICE, account).deleteCredential();
  } catch (err) {
    throw keychainError(err);
  }
}
