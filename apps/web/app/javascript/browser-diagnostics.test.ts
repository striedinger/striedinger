import { describe, expect, it } from "vitest";

import { serializeDiagnosticValue } from "./browser-diagnostics";

describe("serializeDiagnosticValue", function describeSerializeDiagnosticValue() {
  it("uses the unavailable label for missing values", function testMissingValues() {
    expect(serializeDiagnosticValue(undefined, "Unavailable")).toBe("Unavailable");
    expect(serializeDiagnosticValue("", "Unavailable")).toBe("Unavailable");
  });

  it("serializes structured browser values", function testStructuredValues() {
    expect(serializeDiagnosticValue({ mobile: false, platform: "macOS" }, "Unavailable")).toBe(
      '{\n  "mobile": false,\n  "platform": "macOS"\n}',
    );
  });

  it("does not throw for cyclic browser objects", function testCyclicValues() {
    const value: { self?: unknown } = {};
    value.self = value;

    expect(serializeDiagnosticValue(value, "Unavailable")).toBe("[object Object]");
  });
});
