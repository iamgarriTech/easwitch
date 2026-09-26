import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

export interface EasCommand {
  command: string;
  /** Arguments to put before the eas arguments (the bundled script path). */
  prefix: string[];
  /** Version of the bundled eas-cli, when that is what runs. */
  bundled?: string;
}

function findOnPath(name: string): string | undefined {
  const exts = process.platform === "win32" ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";") : [""];
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      const file = path.join(dir, name + ext);
      try {
        fs.accessSync(file, fs.constants.X_OK);
        if (fs.statSync(file).isFile()) return file;
      } catch {
        // not here
      }
    }
  }
  return undefined;
}

/**
 * The eas CLI to run: the user's own `eas` when installed (so `easw build` and
 * `eas build` behave the same), otherwise the eas-cli bundled with easwitch.
 */
export function resolveEas(): EasCommand {
  if (findOnPath("eas")) return { command: "eas", prefix: [] };
  return bundledEas();
}

/** The eas-cli bundled with easwitch. */
export function bundledEas(): EasCommand {
  const require = createRequire(import.meta.url);
  const pkgFile = require.resolve("eas-cli/package.json");
  const pkg = require(pkgFile) as { version: string; bin: { eas: string } };
  // Run the script with our own node rather than its shebang, which also sidesteps .cmd shims on Windows.
  return { command: process.execPath, prefix: [path.join(path.dirname(pkgFile), pkg.bin.eas)], bundled: pkg.version };
}
