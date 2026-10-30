import { describe, expect, it } from "vitest";

import type { Podcast, PodcastEpisode } from "./types";

import { isEpisode, isPodcast } from "./podcast-validation";

const podcast: Podcast = {
  id: "show-1",
  title: "A thoughtful show",
  author: "A curious host",
  artworkUrl: "https://example.com/art.jpg",
  genre: "Technology",
  url: "https://example.com/show",
};

const episode: PodcastEpisode = {
  id: "episode-1",
  title: "Episode 1",
  audioUrl: "http://example.com/episode-1.mp3",
  description: "An episode description",
  durationMilliseconds: 60_000,
  publishedAt: "2026-07-19T00:00:00.000Z",
};

describe("stored podcast validation", function () {
  it("accepts shows and episodes with web links", function () {
    expect(isPodcast(podcast)).toBe(true);
    expect(isEpisode(episode)).toBe(true);
  });

  it("rejects stored links that could run script or leave the web", function () {
    expect(isPodcast({ ...podcast, url: "javascript:alert(1)" })).toBe(false);
    expect(isPodcast({ ...podcast, url: "http://example.com/show" })).toBe(false);
    expect(isPodcast({ ...podcast, artworkUrl: "data:image/svg+xml,<svg/>" })).toBe(false);
    expect(isEpisode({ ...episode, audioUrl: "blob:https://striedinger.com/1" })).toBe(false);
  });
});
