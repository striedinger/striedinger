import { describe, expect, it } from "vitest";

import { choosePeerAlias, createAnonymousAlias, normalizePeerAlias } from "./peer-alias";

describe("peer aliases", function () {
  it("accepts the names the app generates", function () {
    const alias = createAnonymousAlias();

    expect(normalizePeerAlias(alias, "Anonymous neighbor")).toBe(alias);
  });

  it("falls back for free text that could imitate another label", function () {
    expect(normalizePeerAlias("Calm Owl via Swift Fox", "Anonymous neighbor")).toBe(
      "Anonymous neighbor",
    );
    expect(normalizePeerAlias("Calm‮Owl", "Anonymous neighbor")).toBe("Anonymous neighbor");
    expect(normalizePeerAlias(undefined, "Anonymous neighbor")).toBe("Anonymous neighbor");
  });

  it("numbers a connection whose name matches this device or another connection", function () {
    expect(choosePeerAlias("Calm Owl", ["Calm Owl", "Calm Owl 2"], "Anonymous neighbor")).toBe(
      "Calm Owl 3",
    );
    expect(choosePeerAlias("Calm Owl", ["Swift Fox"], "Anonymous neighbor")).toBe("Calm Owl");
  });
});
