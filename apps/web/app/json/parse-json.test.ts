import { describe, expect, it } from "vitest";

import { parseJson } from "./parse-json";

describe("parseJson", function () {
  it("treats whitespace-only input as empty", function () {
    expect(parseJson("  \n  ")).toEqual({ status: "empty" });
  });

  it("returns parsed nested JSON", function () {
    expect(parseJson('{"enabled":true,"items":[1,null,"two"]}')).toEqual({
      status: "valid",
      value: { enabled: true, items: [1, null, "two"] },
    });
  });

  it("returns a useful error for invalid JSON", function () {
    const result = parseJson('{"missing":}');

    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.error).not.toBe("");
    }
  });
});
