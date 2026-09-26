import type { GlobalConfig } from "./config.js";
import { EaswError } from "./errors.js";
import { findProjectLink } from "./project.js";

export interface ResolvedAccount {
  name: string;
  source: "project" | "current";
  /** Set when source is "project". */
  linkFile?: string;
}

/** Project-linked account first, then the current EASwitch account. */
export function resolveAccount(cfg: GlobalConfig, cwd: string): ResolvedAccount {
  const link = findProjectLink(cwd);
  if (link) {
    // Never fall back to the current account here: that could silently
    // build or publish under the wrong Expo account.
    if (!cfg.accounts[link.account]) {
      throw new EaswError(
        `This project is linked to "${link.account}", but that account doesn't exist in EASwitch`,
        `Add it with \`easw add ${link.account}\`, or relink with \`easw link <name>\` (${link.file}).`,
      );
    }
    return { name: link.account, source: "project", linkFile: link.file };
  }
  if (cfg.current && cfg.accounts[cfg.current]) {
    return { name: cfg.current, source: "current" };
  }
  throw new EaswError(
    "No EASwitch account selected",
    Object.keys(cfg.accounts).length
      ? "Pick one with `easw use <name>`."
      : "Add one with `easw add <name>`.",
  );
}
