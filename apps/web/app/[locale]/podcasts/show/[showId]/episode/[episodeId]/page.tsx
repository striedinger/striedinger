import type { Metadata } from "next";

import { Suspense } from "react";

import { getRequestLocale } from "../../../../../../get-request-locale";
import { PodcastEpisodeScreen } from "../../../../podcast-episode-screen";
import { PodcastStackPlaceholder } from "../../../../podcast-stack-placeholder";
import { loadPodcastShow } from "../../../../podcasts-data";
import { createPodcastsMetadata } from "../../../../podcasts-metadata";

interface PodcastEpisodePageProps {
  params: Promise<{ episodeId: string; showId: string }>;
}

export async function generateMetadata({ params }: PodcastEpisodePageProps): Promise<Metadata> {
  const [{ episodeId, showId }, locale] = await Promise.all([params, getRequestLocale()]);
  const show = await loadPodcastShow(showId);
  const episode = show?.episodes.find(function matchesRoute(showEpisode) {
    return showEpisode.id === episodeId;
  });
  return createPodcastsMetadata({
    description: episode?.description.slice(0, 200) || undefined,
    indexable: episode !== undefined,
    locale,
    path: `/podcasts/show/${showId}/episode/${episodeId}`,
    title: episode?.title,
  });
}

export default function PodcastEpisodeRoute({ params }: PodcastEpisodePageProps) {
  const show = params.then(function loadShow({ showId }) {
    return loadPodcastShow(showId);
  });
  return (
    <Suspense fallback={<PodcastStackPlaceholder />}>
      <PodcastEpisodeScreen show={show} />
    </Suspense>
  );
}
