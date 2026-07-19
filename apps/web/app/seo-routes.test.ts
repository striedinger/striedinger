import { describe, expect, it } from "vitest";

import robots from "./robots";
import sitemap from "./sitemap";

describe("SEO discovery routes", function () {
  it("advertises the canonical sitemap and every public page", function () {
    expect(robots().sitemap).toBe("https://striedinger.co/sitemap.xml");
    expect(
      sitemap().map(function selectUrl(entry) {
        return entry.url;
      }),
    ).toEqual([
      "https://striedinger.co",
      "https://striedinger.co/chat",
      "https://striedinger.co/og",
      "https://striedinger.co/drop",
      "https://striedinger.co/json",
      "https://striedinger.co/image",
      "https://striedinger.co/pdf",
      "https://striedinger.co/sudoku",
      "https://striedinger.co/mta",
      "https://striedinger.co/stocks",
      "https://striedinger.co/podcasts",
    ]);
  });
});
