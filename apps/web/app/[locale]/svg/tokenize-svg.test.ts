import { describe, expect, it } from "vitest";

import { encodeSvgTokenLines, tokenizeSvg } from "./tokenize-svg";

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

  it("encodes lines that rebuild the source and compare equal when unchanged", function () {
    const source = '<svg\n  width="1">\n<!-- a\nb -->\n</svg>\n';
    const lines = encodeSvgTokenLines(tokenizeSvg(source));
    const rebuilt = lines
      .map(function decodeLine(line) {
        return line
          .split("\u0002")
          .map(function selectText(pair) {
            return pair.slice(pair.indexOf("\u0001") + 1);
          })
          .join("");
      })
      .join("\n");
    expect(rebuilt).toBe(source);
    expect(encodeSvgTokenLines(tokenizeSvg(source.replace("width", "height")))[0]).toBe(lines[0]);
  });
});
