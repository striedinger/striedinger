import { describe, expect, it } from "vitest";

import { processJson } from "./process-json";

describe("processJson", function () {
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
