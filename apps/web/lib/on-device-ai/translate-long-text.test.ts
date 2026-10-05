import { describe, expect, it, vi } from "vitest";

import { translateLongText } from "./translate-long-text";

describe("translateLongText", function () {
  it("translates long text in paragraph pieces, in order, reporting progress", async function () {
    const translate = vi.fn<(text: string) => Promise<string>>(async function upperCase(text) {
      return text.toUpperCase();
    });
    const paragraphs = Array.from({ length: 6 }, function createParagraph(_, index) {
      return `${index} ${"word ".repeat(60)}`.trim();
    });
    const updates: string[] = [];

    const translation = await translateLongText(
      { destroy() {}, translate },
      paragraphs.join("\n"),
      function recordUpdate(text) {
        updates.push(text);
      },
      new AbortController().signal,
    );

    expect(translation).toBe(paragraphs.join("\n").toUpperCase());
    expect(translate.mock.calls.length).toBeGreaterThan(1);
    expect(updates.at(-1)).toBe(translation);
  });
});
