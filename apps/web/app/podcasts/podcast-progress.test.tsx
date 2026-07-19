import { beforeEach, describe, expect, it } from "vitest";

import type { Podcast, PodcastEpisode } from "./types";

import { readPodcastProgress, savePodcastProgress } from "./podcast-progress";

const podcast: Podcast = {
  id: "show-1",
  title: "A thoughtful show",
  author: "A curious host",
  artworkUrl: "https://example.com/art.jpg",
  genre: "Technology",
  url: "https://example.com/show",
};

function createEpisode(index: number): PodcastEpisode {
  return {
    id: `episode-${index}`,
    title: `Episode ${index}`,
    audioUrl: `https://example.com/episode-${index}.mp3`,
    description: "An episode description",
    durationMilliseconds: 60_000,
    publishedAt: "2026-07-19T00:00:00.000Z",
  };
}

describe("podcast progress storage", function () {
  beforeEach(function clearProgress() {
    window.localStorage.clear();
  });

  it("keeps only the 30 most recently used episodes", function () {
    for (let index = 0; index < 31; index += 1) {
      savePodcastProgress(podcast, createEpisode(index), 15, 60);
    }

    const progress = readPodcastProgress();
    expect(progress).toHaveLength(30);
    expect(progress[0]?.episode.id).toBe("episode-30");
    expect(
      progress.some(function includesEvictedEpisode(item) {
        return item.episode.id === "episode-0";
      }),
    ).toBe(false);
  });

  it("touches an existing episode and moves it to the front", function () {
    const firstEpisode = createEpisode(1);
    savePodcastProgress(podcast, firstEpisode, 15, 60);
    savePodcastProgress(podcast, createEpisode(2), 15, 60);
    savePodcastProgress(podcast, firstEpisode, 20, 60);

    const progress = readPodcastProgress();
    expect(
      progress.map(function getEpisodeId(item) {
        return item.episode.id;
      }),
    ).toEqual(["episode-1", "episode-2"]);
    expect(progress[0]?.positionSeconds).toBe(20);
  });

  it("does not retain negligible or completed playback", function () {
    const episode = createEpisode(1);
    savePodcastProgress(podcast, episode, 4, 60);
    expect(readPodcastProgress()).toEqual([]);

    savePodcastProgress(podcast, episode, 20, 60);
    savePodcastProgress(podcast, episode, 55, 60);
    expect(readPodcastProgress()).toEqual([]);
  });
});
