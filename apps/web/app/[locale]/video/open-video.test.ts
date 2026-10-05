import { describe, expect, it } from "vitest";

import { isLocationTag } from "./open-video";

describe("isLocationTag", function () {
  it("recognizes the location tags cameras write, and nothing else", function () {
    expect(isLocationTag("©xyz")).toBe(true);
    expect(isLocationTag("loci")).toBe(true);
    expect(isLocationTag("com.apple.quicktime.location.ISO6709")).toBe(true);
    expect(isLocationTag("©nam")).toBe(false);
    expect(isLocationTag("©too")).toBe(false);
  });
});
