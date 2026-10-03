import { describe, expect, it } from "vitest";

import {
  getEpisodeHref,
  getNewEpisodesHref,
  getPodcastPathDepth,
  getPodcastPathScope,
  getSearchHref,
  parsePodcastSegments,
} from "./podcast-route";

const podcast = {
  artworkUrl: "",
  author: "",
  genre: "",
  id: "42",
  title: "Show",
  url: "",
};
const episode = {
  audioUrl: "",
  description: "",
  durationMilliseconds: 0,
  id: "1000",
  publishedAt: "",
  title: "Episode",
};

describe("podcast routes", function () {
  it("round-trips episode destinations and drops unsafe identifiers", function () {
    const href = getEpisodeHref({ podcast, episode });

    expect(href).toBe("/podcasts/show-42/episode-1000");
    expect(parsePodcastSegments(href.split("/").slice(2))).toEqual({
      episodeId: "1000",
      libraryView: null,
      podcastId: "42",
      tab: null,
    });
    expect(parsePodcastSegments(["show-12a"]).podcastId).toBeNull();
  });

  it("builds readable slugs and reads only the id from them", function () {
    expect(
      getEpisodeHref({
        podcast: { ...podcast, title: "Café Society: Après Ski!" },
        episode: { ...episode, title: "日本語" },
      }),
    ).toBe("/podcasts/cafe-society-apres-ski-42/1000");
    expect(parsePodcastSegments(["an-old-title-42"]).podcastId).toBe("42");
  });

  it("keeps only known library views", function () {
    expect(parsePodcastSegments(["library", "saved"]).libraryView).toBe("saved");
    expect(parsePodcastSegments(["library", "other"]).libraryView).toBeNull();
  });

  it("normalizes search and New tab links", function () {
    expect(getSearchHref("  true   crime ")).toBe("/podcasts/search?q=true+crime");
    expect(getSearchHref("a")).toBe("/podcasts/search");
    expect(getNewEpisodesHref(["30", "10", "abc", "10"])).toBe("/podcasts/new?shows=10,30");
  });

  it("orders screens for history moves, with or without a locale prefix", function () {
    expect(getPodcastPathDepth("/es/podcasts")).toBe(0);
    expect(getPodcastPathDepth("/podcasts/library/saved")).toBe(1);
    expect(getPodcastPathDepth("/podcasts/show-42")).toBe(2);
    expect(getPodcastPathDepth("/es/podcasts/show-42/episode-1")).toBe(3);
    expect(getPodcastPathScope("/podcasts/search")).toBe("search");
    expect(getPodcastPathScope("/podcasts/show-42")).toBeNull();
  });
});
