import { describe, expect, it } from "vitest";

import { parsePageMetadata } from "./parse-page-metadata";

describe("page metadata", function () {
  it("decodes entities and keeps an out-of-range one as written", function () {
    const html = `<head><meta property="og:title" content="Caf&#233; &amp; &#x1F600; &#99999999;"></head>`;

    const metadata = parsePageMetadata(html, new URL("https://example.com"));

    expect(metadata.title).toBe("Café & 😀 &#99999999;");
  });
});
