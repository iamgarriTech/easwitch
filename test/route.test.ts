import { describe, expect, it } from "vitest";
import { route } from "../src/route.js";

describe("route", () => {
  it("leaves easw's own commands, flags and unknown commands to commander", () => {
    for (const argv of [[], ["--help"], ["-V"], ["add", "work"], ["ls"], ["env:list"], ["login"]]) {
      expect(route(argv)).toEqual({ kind: "easw" });
    }
  });

  it("forwards the supported eas commands verbatim", () => {
    expect(route(["build", "--platform", "ios", "--help"])).toEqual({
      kind: "run",
      command: "eas",
      args: ["build", "--platform", "ios", "--help"],
    });
  });

  it("runs arbitrary commands with exec, with or without --", () => {
    expect(route(["exec", "eas", "env:list"])).toEqual({ kind: "run", command: "eas", args: ["env:list"] });
    expect(route(["exec", "--", "node", "-v"])).toEqual({ kind: "run", command: "node", args: ["-v"] });
    expect(() => route(["exec"])).toThrow(/Usage/);
  });
});
