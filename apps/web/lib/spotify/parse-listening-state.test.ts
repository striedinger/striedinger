import { describe, expect, it } from "vitest";

import { parseCurrentlyPlaying, parseRecentlyPlayed } from "./parse-listening-state";

const song = {
  type: "track",
  name: "Midnight City",
  duration_ms: 244_000,
  external_urls: { spotify: "https://open.spotify.com/track/1eyzqe2QqGZUmfcPZtrIyt" },
  artists: [{ name: "M83" }, { name: "Anthony Gonzalez" }],
  album: {
    name: "Hurry Up, We're Dreaming",
    images: [
      { url: "https://i.scdn.co/image/large", width: 640 },
      { url: "https://i.scdn.co/image/medium", width: 300 },
      { url: "https://i.scdn.co/image/small", width: 64 },
    ],
  },
};

describe("parseCurrentlyPlaying", function () {
  it("reads a playing song with its artists, album, and medium artwork", function () {
    const state = parseCurrentlyPlaying({ is_playing: true, progress_ms: 134_000, item: song }, 42);

    expect(state).toEqual({
      status: "playing",
      progressMs: 134_000,
      observedAt: 42,
      track: {
        title: "Midnight City",
        subtitle: "M83, Anthony Gonzalez",
        album: "Hurry Up, We're Dreaming",
        artworkUrl: "https://i.scdn.co/image/medium",
        spotifyUrl: "https://open.spotify.com/track/1eyzqe2QqGZUmfcPZtrIyt",
        durationMs: 244_000,
      },
    });
  });

  it("reports a paused player and keeps progress within the song", function () {
    const state = parseCurrentlyPlaying({ is_playing: false, progress_ms: 999_999, item: song }, 0);

    expect(state).toMatchObject({ status: "paused", progressMs: 244_000 });
  });

  it("names the show of a podcast episode", function () {
    const episode = {
      type: "episode",
      name: "The Daily Mix",
      duration_ms: 1_800_000,
      show: { name: "Tech Talk", images: [{ url: "https://i.scdn.co/image/show", width: 300 }] },
    };

    const state = parseCurrentlyPlaying({ is_playing: true, progress_ms: 0, item: episode }, 0);

    expect(state).toMatchObject({
      track: { subtitle: "Tech Talk", album: "", artworkUrl: "https://i.scdn.co/image/show" },
    });
  });

  it("falls back to the show's artwork when an episode has none of its own", function () {
    const episode = {
      type: "episode",
      name: "The Daily Mix",
      images: [],
      show: { name: "Tech Talk", images: [{ url: "https://i.scdn.co/image/show", width: 300 }] },
    };

    const state = parseCurrentlyPlaying({ is_playing: true, progress_ms: 0, item: episode }, 0);

    expect(state).toMatchObject({ track: { artworkUrl: "https://i.scdn.co/image/show" } });
  });

  it("treats an empty player, such as during an ad, as nothing playing", function () {
    expect(parseCurrentlyPlaying({ is_playing: true, item: null }, 0)).toBeNull();
  });

  it("drops links and artwork outside Spotify's own hosts", function () {
    const state = parseCurrentlyPlaying(
      {
        is_playing: true,
        progress_ms: 0,
        item: {
          ...song,
          external_urls: { spotify: "javascript:alert(1)" },
          album: { name: "x", images: [{ url: "https://example.com/art.jpg", width: 300 }] },
        },
      },
      0,
    );

    expect(state).toMatchObject({ track: { spotifyUrl: "", artworkUrl: "" } });
  });
});

describe("parseRecentlyPlayed", function () {
  it("returns the last song and when it played", function () {
    const state = parseRecentlyPlayed({
      items: [{ played_at: "2026-10-27T18:00:00.000Z", track: song }],
    });

    expect(state).toMatchObject({
      status: "idle",
      playedAt: "2026-10-27T18:00:00.000Z",
      track: { title: "Midnight City" },
    });
  });

  it("has no song when the history is empty", function () {
    expect(parseRecentlyPlayed({ items: [] })).toEqual({
      status: "idle",
      track: null,
      playedAt: null,
    });
  });
});
