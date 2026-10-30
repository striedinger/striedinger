import { describe, expect, it } from "vitest";

import { parsePageMetadata } from "./parse-page-metadata";

describe("page metadata", function () {
  it("decodes entities and keeps an out-of-range one as written", function () {
    const html = `<head><meta property="og:title" content="Caf&#233; &amp; &#x1F600; &#99999999;"></head>`;

    const metadata = parsePageMetadata(html, new URL("https://example.com"));

    expect(metadata.title).toBe("Café & 😀 &#99999999;");
  });
});

describe("page metadata parsing time", function () {
  it.each([
    ["unterminated meta tags", "<meta "],
    ["unterminated link tags", "<link "],
    ["unclosed title tags", "<title>"],
    ["unterminated attributes", '<meta content="'],
  ])("reads a megabyte of %s quickly", function (_label, fragment) {
    const html = `<head><meta property="og:title" content="Kept">${fragment.repeat(1_000_000 / fragment.length)}`;
    const startedAt = performance.now();

    const metadata = parsePageMetadata(html, new URL("https://example.com"));

    expect(performance.now() - startedAt).toBeLessThan(100);
    expect(metadata.title).toBe("Kept");
  });

  it("still reads a typical head", function () {
    const html = `<html><head>
      <title>  Document   title </title>
      <meta name="description" content="A description">
      <meta property="og:image" content="/card.png">
      <link rel="canonical" href="https://example.com/canonical">
    </head><body><meta property="og:title" content="Ignored"></body></html>`;

    const metadata = parsePageMetadata(html, new URL("https://example.com/page"));

    expect(metadata).toMatchObject({
      canonicalUrl: "https://example.com/canonical",
      description: "A description",
      image: "https://example.com/card.png",
      title: "Document title",
    });
  });
});
