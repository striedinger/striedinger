import { describe, expect, it } from "vitest";

import {
  createLanguageAlternates,
  getPathLocale,
  localizePath,
  stripLocaleFromPath,
} from "./locale-path";

describe("locale paths", function () {
  it("keeps English on canonical unprefixed URLs and prefixes other locales", function () {
    expect(localizePath("/image", "en")).toBe("/image");
    expect(localizePath("/image", "es")).toBe("/es/image");
    expect(localizePath("/", "ja")).toBe("/ja");
  });

  it("detects and removes only supported locale prefixes", function () {
    expect(getPathLocale("/fr/pdf")).toBe("fr");
    expect(stripLocaleFromPath("/fr/pdf")).toBe("/pdf");
    expect(stripLocaleFromPath("/image")).toBe("/image");
    expect(getPathLocale("/english/image")).toBeNull();
  });

  it("creates reciprocal language alternatives with an unprefixed default", function () {
    expect(createLanguageAlternates("/json")).toMatchObject({
      "x-default": "/json",
      en: "/json",
      es: "/es/json",
      ja: "/ja/json",
    });
  });
});
