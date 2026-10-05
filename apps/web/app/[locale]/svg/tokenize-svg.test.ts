import { describe, expect, it } from "vitest";

import { tokenizeSvg } from "./tokenize-svg";

function join(source: string) {
  return tokenizeSvg(source)
    .map(function selectText(token) {
      return token.text;
    })
    .join("");
}

describe("tokenizeSvg", function () {
  it("colors tags, attributes, values, and comments", function () {
    const tokens = tokenizeSvg('<!-- a --><rect width="4"/>');
    expect(
      tokens.map(function selectKindAndText({ kind, text }) {
        return { kind, text };
      }),
    ).toEqual([
      { kind: "comment", text: "<!-- a -->" },
      { kind: "punctuation", text: "<" },
      { kind: "tag", text: "rect" },
      { kind: "text", text: " " },
      { kind: "attribute", text: "width" },
      { kind: "punctuation", text: "=" },
      { kind: "value", text: '"4"' },
      { kind: "punctuation", text: "/>" },
    ]);
  });

  it("always rebuilds the exact source, even while it is half typed", function () {
    for (const source of [
      '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg">\n  <g fill=\'red\'>x</g>\n</svg>\n',
      '<svg width="1',
      "<svg <rect",
      "<!-- open",
      "a < b",
      "</",
    ]) {
      expect(join(source)).toBe(source);
    }
  });
});
