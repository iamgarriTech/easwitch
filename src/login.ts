import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import spawn from "cross-spawn";
import { bundledEas } from "./eas.js";
import { EaswError } from "./errors.js";

export type LoginMethod = "browser" | "password" | "sso";

export const LOGIN_METHODS: LoginMethod[] = ["browser", "password", "sso"];

const GRAPHQL_URL = "https://api.expo.dev/graphql";

const CREATE_ACCESS_TOKEN = `
  mutation CreateAccessToken($data: CreateAccessTokenInput!) {
    accessToken {
      createAccessToken(createAccessTokenData: $data) {
        token
      }
    }
  }
`;

function runEas(args: string[], env: NodeJS.ProcessEnv, interactive: boolean): Promise<number> {
  const eas = bundledEas();
  return new Promise((resolve, reject) => {
    const child = spawn(eas.command, [...eas.prefix, ...args], {
      env,
      stdio: interactive ? "inherit" : "ignore",
    });
    // Ctrl+C reaches the child too; stay alive so the caller's cleanup still runs.
    const ignore = () => {};
    if (interactive) process.on("SIGINT", ignore);
    const done = () => process.off("SIGINT", ignore);
    child.on("error", (err) => {
      done();
      reject(err);
    });
    child.on("close", (code) => {
      done();
      resolve(code ?? 1);
    });
  });
}

async function createAccessToken(sessionSecret: string, actorID: string, note: string): Promise<string> {
  let body: { data?: { accessToken?: { createAccessToken?: { token?: string } } }; errors?: { message: string }[] };
  try {
    const res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "expo-session": sessionSecret },
      body: JSON.stringify({ query: CREATE_ACCESS_TOKEN, variables: { data: { actorID, note } } }),
    });
    body = (await res.json()) as typeof body;
  } catch (err) {
    throw new EaswError(`Couldn't reach Expo to create an access token: ${(err as Error).message}`);
  }
  const token = body.data?.accessToken?.createAccessToken?.token;
  if (!token) {
    throw new EaswError(
      `Expo didn't create an access token: ${body.errors?.[0]?.message ?? "unknown error"}`,
      "You can paste a token instead with `easw add <name> --token`.",
    );
  }
  return token;
}

/**
 * Log in with `eas login` in a throwaway home directory, so the user's normal
 * ~/.expo session is never read or written, then use that temporary session to
 * create a long-lived access token. The temporary session is logged out
 * (invalidated on Expo's servers) and deleted afterwards.
 *
 * Always uses the bundled eas-cli: a global `eas` may be a version-manager shim
 * that depends on the real HOME.
 */
export async function loginForToken(method: LoginMethod, note: string): Promise<{ token: string; username: string }> {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "easw-login-"));
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, USERPROFILE: home };
  delete env.EXPO_TOKEN;
  const args = method === "password" ? ["login", "--no-browser"] : method === "sso" ? ["login", "--sso"] : ["login"];

  try {
    const code = await runEas(args, env, true);
    let auth: { sessionSecret?: string; userId?: string; username?: string } | undefined;
    try {
      auth = JSON.parse(fs.readFileSync(path.join(home, ".expo", "state.json"), "utf8")).auth;
    } catch {
      // No state file means the login didn't finish.
    }
    if (code !== 0 || !auth?.sessionSecret || !auth.userId || !auth.username) {
      throw new EaswError("Expo login didn't complete", "Try again, or paste a token with `easw add <name> --token`.");
    }
    const token = await createAccessToken(auth.sessionSecret, auth.userId, note);
    return { token, username: auth.username };
  } finally {
    // Best effort: invalidate the temporary session on Expo's servers, then remove it from disk.
    await runEas(["logout"], env, false).catch(() => {});
    fs.rmSync(home, { recursive: true, force: true });
  }
}
