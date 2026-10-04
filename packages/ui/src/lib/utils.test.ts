import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", function () {
  it("treats iOS text styles as font sizes, replacing default sizes but keeping colors", function () {
    expect(cn("text-base leading-6 text-foreground", "text-ios-body text-ios-label")).toBe(
      "text-ios-body text-ios-label",
    );
    expect(cn("text-ios-footnote", "text-ios-secondary-label")).toBe(
      "text-ios-footnote text-ios-secondary-label",
    );
  });
});
