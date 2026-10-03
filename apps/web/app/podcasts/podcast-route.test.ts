import { describe, expect, it } from "vitest";

import { createPodcastHref, parsePodcastRoute } from "./podcast-route";

describe("podcast routes", function () {
  it("opens the search tab for shared search links and drops unsafe identifiers", function () {
    const route = parsePodcastRoute(
      new URLSearchParams("q=%20true%20%20crime%20&podcast=12a&episode=9"),
    );

    expect(route).toEqual({
      episodeId: null,
      libraryView: null,
      podcastId: null,
      query: "true crime",
      tab: "search",
    });
  });

  it("keeps library views only on the library tab", function () {
    expect(parsePodcastRoute(new URLSearchParams("tab=library&view=saved")).libraryView).toBe(
      "saved",
    );
    expect(parsePodcastRoute(new URLSearchParams("tab=home&view=saved")).libraryView).toBeNull();
  });

  it("round-trips show and episode destinations", function () {
    const href = createPodcastHref("/es/podcasts", {
      episodeId: "1000",
      libraryView: null,
      podcastId: "42",
      query: "",
      tab: "browse",
    });

    expect(href).toBe("/es/podcasts?tab=browse&podcast=42&episode=1000");
    expect(parsePodcastRoute(new URL(href, "https://example.com").searchParams)).toMatchObject({
      episodeId: "1000",
      podcastId: "42",
      tab: "browse",
    });
  });
});
