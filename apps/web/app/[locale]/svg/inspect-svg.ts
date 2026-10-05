import type { SvgInspection } from "./types";

export const maximumSvgCharacters = 1_000_000;

const svgNamespace = "http://www.w3.org/2000/svg";

/**
 * Parses SVG markup as XML, the way browsers load `.svg` files, and reports its size and
 * shape. Needs `DOMParser`, so it runs only in the browser.
 */
export function inspectSvg(source: string): SvgInspection {
  if (!source.trim()) return { status: "empty" };
  if (source.length > maximumSvgCharacters) {
    return { status: "invalid", error: "", reason: "too-large" };
  }
  const document = new DOMParser().parseFromString(source, "image/svg+xml");
  const parserError = document.querySelector("parsererror");
  if (parserError) {
    return { status: "invalid", error: readParserError(parserError), reason: "syntax" };
  }
  const root = document.documentElement;
  if (root.localName !== "svg" || root.namespaceURI !== svgNamespace) {
    return { status: "invalid", error: "", reason: "not-svg" };
  }
  const viewBox = readViewBox(root.getAttribute("viewBox"));
  return {
    status: "valid",
    byteLength: new TextEncoder().encode(source).byteLength,
    elementCount: root.getElementsByTagName("*").length + 1,
    height: readLength(root.getAttribute("height")) ?? viewBox?.height ?? null,
    width: readLength(root.getAttribute("width")) ?? viewBox?.width ?? null,
  };
}

/** Browsers wrap the parser's message in their own text; keep the first meaningful line. */
function readParserError(parserError: Element) {
  const lines = (parserError.textContent ?? "")
    .split("\n")
    .map(function trimLine(line) {
      return line.trim();
    })
    .filter(Boolean);
  const message =
    lines.find(function isDetail(line) {
      return /line \d+/i.test(line);
    }) ??
    lines[0] ??
    "";
  return message.replace(/^This page contains the following errors:\s*/i, "").slice(0, 200);
}

/** Unitless and pixel lengths only; percentages and other units depend on the page. */
function readLength(value: string | null) {
  if (!value) return null;
  const match = /^\s*(\d*\.?\d+)\s*(px)?\s*$/.exec(value);
  const length = match ? Number(match[1]) : Number.NaN;
  return length > 0 ? length : null;
}

function readViewBox(value: string | null) {
  const numbers = value
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (!numbers || numbers.length !== 4 || numbers.some(Number.isNaN)) return null;
  const [, , width = 0, height = 0] = numbers;
  return width > 0 && height > 0 ? { width, height } : null;
}
