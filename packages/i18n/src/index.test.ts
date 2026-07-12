import { describe, expect, it } from "vitest";

import { composeCatalogs, createTranslator, resolveLocale } from "./index";

describe("resolveLocale", function () {
  it("selects the first supported browser language and handles regional tags", function () {
    expect(resolveLocale(["ko-KR", "pt-BR", "en-US"])).toBe("pt");
  });

  it("falls back to English when no browser language is supported", function () {
    expect(resolveLocale(["ko-KR", "ar"])).toBe("en");
  });
});

describe("catalog composition", function () {
  it("creates one translator from independently owned catalogs", function () {
    const catalog = composeCatalogs(
      { "Shared message": "Shared translation" },
      { "Route message": "Route translation" },
    );
    const translate = createTranslator(catalog);

    expect(translate("Shared message")).toBe("Shared translation");
    expect(translate("Route message")).toBe("Route translation");
  });
});
