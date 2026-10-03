import { supportedLocales } from "@workspace/i18n";
import { describe, expect, it, vi } from "vitest";

import robots from "./robots";
import sitemap from "./sitemap";

vi.mock("../lib/podcasts/apple-podcasts", function mockApplePodcasts() {
  return {
    getPopularPodcasts: async () => [
      {
        artworkUrl: "https://example.com/art.jpg",
        author: "Audiochuck",
        genre: "True Crime",
        id: "1322200189",
        title: "Crime Junkie",
        url: "https://podcasts.apple.com/podcast/id1322200189",
      },
    ],
  };
});

describe("SEO discovery routes", function () {
  it("advertises the canonical sitemap, every public page, and top shows", async function () {
    expect(robots().sitemap).toBe("https://striedinger.co/sitemap.xml");
    const sitemapEntries = await sitemap();
    const englishUrls = [
      "https://striedinger.co",
      "https://striedinger.co/chat",
      "https://striedinger.co/drop",
      "https://striedinger.co/og",
      "https://striedinger.co/ip",
      "https://striedinger.co/javascript",
      "https://striedinger.co/image",
      "https://striedinger.co/pdf",
      "https://striedinger.co/json",
      "https://striedinger.co/sudoku",
      "https://striedinger.co/mta",
      "https://striedinger.co/stocks",
      "https://striedinger.co/podcasts",
      "https://striedinger.co/notes",
      "https://striedinger.co/podcasts/crime-junkie-1322200189",
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
          entry.images?.length === 1 &&
          Object.keys(entry.alternates?.languages ?? {}).length === supportedLocales.length + 1
        );
      }),
    ).toBe(true);
  });
});
