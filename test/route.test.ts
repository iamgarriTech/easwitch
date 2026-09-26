import { describe, expect, it } from "vitest";
import { route } from "../src/route.js";

describe("route", () => {
  it("keeps easw's own commands and flags", () => {
    for (const argv of [[], ["--help"], ["-V"], ["add", "work"], ["ls"], ["help", "link"], ["shell-init", "zsh"]]) {
      expect(route(argv)).toEqual({ kind: "easw" });
    }
  });

  it("forwards any other subcommand to eas verbatim", () => {
    expect(route(["build", "--platform", "ios", "--help"])).toEqual({
      kind: "run",
      command: "eas",
      args: ["build", "--platform", "ios", "--help"],
    });
    expect(route(["env:list"])).toEqual({ kind: "run", command: "eas", args: ["env:list"] });
  });

  it("runs arbitrary commands with exec, with or without --", () => {
    expect(route(["exec", "npx", "expo", "start"])).toEqual({ kind: "run", command: "npx", args: ["expo", "start"] });
    expect(route(["exec", "--", "node", "-v"])).toEqual({ kind: "run", command: "node", args: ["-v"] });
    expect(() => route(["exec"])).toThrow(/Usage/);
  });

  it("blocks commands that would change the normal Expo login", () => {
    for (const sub of ["login", "logout", "account:login", "account:logout"]) {
      expect(() => route([sub])).toThrow(/normal Expo login/);
    }
  });

  it("routes easw eas like the shell hook", () => {
    expect(route(["eas", "build", "--platform", "ios"])).toEqual({
      kind: "shell-eas",
      args: ["build", "--platform", "ios"],
    });
    expect(route(["env", "fish"])).toEqual({ kind: "easw" });
    expect(route(["env:list"])).toEqual({ kind: "run", command: "eas", args: ["env:list"] });
  });

  it("keeps the legacy __shell-eas name working for older hooks", () => {
    expect(route(["__shell-eas", "build", "--platform", "ios"])).toEqual({
      kind: "shell-eas",
      args: ["build", "--platform", "ios"],
    });
    // Login is decided later, by the hook runner, so it isn't blocked here.
    expect(route(["__shell-eas", "login"])).toEqual({ kind: "shell-eas", args: ["login"] });
  });
});
