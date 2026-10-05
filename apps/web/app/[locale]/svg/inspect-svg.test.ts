// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { inspectSvg } from "./inspect-svg";

describe("inspectSvg", function () {
  it("reports the size of a drawing from its width and height", function () {
    const result = inspectSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" width="48px" height="32"><rect width="4" height="4"/></svg>',
    );
    expect(result).toMatchObject({ status: "valid", width: 48, height: 32, elementCount: 2 });
  });

  it("falls back to the view box when dimensions are relative", function () {
    const result = inspectSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 12"></svg>',
    );
    expect(result).toMatchObject({ status: "valid", width: 24, height: 12 });
  });

  it("reports malformed markup with the parser's message", function () {
    const result = inspectSvg('<svg xmlns="http://www.w3.org/2000/svg"><rect></svg>');
    expect(result).toMatchObject({ status: "invalid", reason: "syntax" });
  });

  it("rejects well-formed XML that is not an SVG image", function () {
    expect(inspectSvg("<svg><rect/></svg>")).toMatchObject({ reason: "not-svg" });
    expect(inspectSvg('<html xmlns="http://www.w3.org/1999/xhtml"/>')).toMatchObject({
      reason: "not-svg",
    });
  });

  it("treats blank input as empty", function () {
    expect(inspectSvg("  \n")).toEqual({ status: "empty" });
  });
});
