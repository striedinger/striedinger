import { describe, expect, it } from "vitest";

import { normalizePreviewUrl } from "./normalize-preview-url";

describe("normalizePreviewUrl", function () {
  it("normalizes equivalent submitted URLs for duplicate detection", function () {
    expect(normalizePreviewUrl(" https://example.com/path#section ")).toBe(
      "https://example.com/path",
    );
  });

  it("preserves invalid input for validation feedback", function () {
    expect(normalizePreviewUrl("  not a URL  ")).toBe("not a URL");
  });
});
