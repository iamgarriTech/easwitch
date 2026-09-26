import { afterEach, describe, expect, it } from "vitest";
import { tokenService } from "../src/tokens.js";

const original = process.env.EASWITCH_CONFIG_DIR;
afterEach(() => {
  if (original === undefined) delete process.env.EASWITCH_CONFIG_DIR;
  else process.env.EASWITCH_CONFIG_DIR = original;
});

describe("tokenService", () => {
  it("uses the plain service name for the real config", () => {
    delete process.env.EASWITCH_CONFIG_DIR;
    expect(tokenService()).toBe("easwitch");
  });

  it("keeps a custom config dir's tokens apart from the real ones", () => {
    process.env.EASWITCH_CONFIG_DIR = "/tmp/easw-a";
    const a = tokenService();
    process.env.EASWITCH_CONFIG_DIR = "/tmp/easw-b";
    const b = tokenService();
    expect(a).not.toBe("easwitch");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^easwitch:[0-9a-f]{12}$/);
  });
});
