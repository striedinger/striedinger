import { describe, expect, it } from "vitest";

import { processJson } from "./process-json";

describe("processJson", function () {
  it("accepts deeply nested valid JSON without overflowing the formatter stack", function () {
    const input = "[".repeat(20_000) + "0" + "]".repeat(20_000);
    const response = processJson(input);
    expect(response.result.status).toBe("valid");
    if (response.result.status === "valid") expect(response.result.previewable).toBe(false);
    expect(response.formattedInput).toBeUndefined();
  });

  it("does not expand the editor beyond its input limit", function () {
    const input = JSON.stringify(
      Array.from({ length: 100 }, function createValue() {
        return "x".repeat(4_995);
      }),
    );
    expect(input.length).toBeLessThan(500_000);
    expect(processJson(input).formattedInput).toBeUndefined();
  });

  it("formats valid input and keeps ordinary values previewable", function () {
    const response = processJson('{"value":1}');

    expect(response.formattedInput).toBe('{\n  "value": 1\n}');
    expect(response.result).toMatchObject({ status: "valid", previewable: true });
  });

  it("does not attempt to render a tree with too many nodes", function () {
    const response = processJson(
      JSON.stringify(
        Array.from({ length: 10_001 }, function createValue() {
          return 0;
        }),
      ),
    );

    expect(response.result).toMatchObject({ status: "valid", previewable: false });
  });
});
