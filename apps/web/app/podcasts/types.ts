import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "../../messages/podcasts/en";

export type PodcastMessages = TranslationCatalog<typeof englishMessages>;

export interface Podcast {
  author: string;
  artworkUrl: string;
  episodeCount?: number;
  explicit?: boolean;
  genre: string;
  id: string;
  latestReleaseAt?: string;
  title: string;
  url: string;
}

export interface PodcastEpisode {
  audioUrl: string;
  description: string;
  durationMilliseconds: number;
  id: string;
  publishedAt: string;
  title: string;
}

export interface PodcastProgress {
  durationSeconds: number;
  episode: PodcastEpisode;
  podcast: Podcast;
  positionSeconds: number;
  updatedAt: string;
}
