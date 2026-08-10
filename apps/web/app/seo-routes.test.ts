import { supportedLocales } from "@workspace/i18n";
import { describe, expect, it } from "vitest";

import robots from "./robots";
import sitemap from "./sitemap";

describe("SEO discovery routes", function () {
  it("advertises the canonical sitemap and every public page", function () {
    expect(robots().sitemap).toBe("https://striedinger.co/sitemap.xml");
    const sitemapEntries = sitemap();
    const englishUrls = [
      "https://striedinger.co",
      "https://striedinger.co/chat",
      "https://striedinger.co/drop",
      "https://striedinger.co/og",
      "https://striedinger.co/image",
      "https://striedinger.co/pdf",
      "https://striedinger.co/json",
      "https://striedinger.co/sudoku",
      "https://striedinger.co/mta",
      "https://striedinger.co/stocks",
      "https://striedinger.co/podcasts",
    ];

    expect(sitemapEntries).toHaveLength(englishUrls.length * supportedLocales.length);
    expect(
      sitemapEntries
        .filter(function selectEnglishEntries(_entry, index) {
          return index % supportedLocales.length === 0;
        })
        .map(function selectUrl(entry) {
          return entry.url;
        }),
    ).toEqual(englishUrls);
    expect(sitemapEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: "https://striedinger.co/es/image" }),
        expect.objectContaining({ url: "https://striedinger.co/ja/podcasts" }),
      ]),
    );
    expect(
      sitemapEntries.every(function hasDiscoveryMetadata(entry) {
        return (
          entry.lastModified instanceof Date &&
          entry.images?.length === 1 &&
          Object.keys(entry.alternates?.languages ?? {}).length === supportedLocales.length + 1
        );
      }),
    ).toBe(true);
  });
});
