import type { Podcast, PodcastEpisode, PodcastMessages } from "./types";

import {
  getPodcastShow,
  getPopularPodcasts,
  searchPodcastCatalog,
} from "../../lib/podcasts/apple-podcasts";
import { PodcastsExplorer } from "./podcasts-explorer";

interface PodcastsExplorerLoaderProps {
  initialEpisodeId: string;
  initialQuery: string;
  locale: string;
  messages: PodcastMessages;
  podcastId: string;
}

export async function PodcastsExplorerLoader({
  initialEpisodeId,
  initialQuery,
  locale,
  messages,
  podcastId,
}: PodcastsExplorerLoaderProps) {
  const [initialPodcasts, initialShow] = await Promise.all([
    (initialQuery ? searchPodcastCatalog(initialQuery) : getPopularPodcasts()).catch(
      function useEmptyPodcastResults() {
        return [];
      },
    ),
    podcastId
      ? getPodcastShow(podcastId).catch(function useUnavailablePodcast() {
          return [null, []] as [Podcast | null, PodcastEpisode[]];
        })
      : Promise.resolve([null, []] as [Podcast | null, PodcastEpisode[]]),
  ]);
  const [initialSelectedPodcast, initialEpisodes] = initialShow;

  return (
    <PodcastsExplorer
      initialEpisodeId={initialEpisodeId}
      initialEpisodes={initialEpisodes}
      initialPodcasts={initialPodcasts}
      initialQuery={initialQuery}
      initialSelectedPodcast={initialSelectedPodcast}
      messages={messages}
      locale={locale}
    />
  );
}
