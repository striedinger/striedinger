import { describe, expect, it } from "vitest";

import { insertTitleAndDescription } from "./svg-intelligence";

describe("insertTitleAndDescription", function () {
  it("puts an escaped title and description first, replacing earlier ones", function () {
    const source =
      '<svg xmlns="http://www.w3.org/2000/svg">\n  <title>Old</title>\n  <desc>Old</desc>\n  <rect/>\n</svg>';
    expect(insertTitleAndDescription(source, "Sun & sea", "A <bright> day")).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg">\n  <title>Sun &amp; sea</title>\n  <desc>A &lt;bright&gt; day</desc>\n  <rect/>\n</svg>',
    );
  });
});
