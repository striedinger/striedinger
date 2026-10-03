import type { Metadata } from "next";

import { Suspense } from "react";

import { getRequestLocale } from "../../../../get-request-locale";
import { PodcastEpisodeScreen } from "../../podcast-episode-screen";
import { getEpisodeHref, readSlugSegmentId } from "../../podcast-route";
import { PodcastStackPlaceholder } from "../../podcast-stack-placeholder";
import { PodcastStructuredData } from "../../podcast-structured-data";
import { loadPodcastShowForSegment } from "../../podcasts-data";
import { createPodcastsMetadata } from "../../podcasts-metadata";

interface PodcastEpisodePageProps {
  params: Promise<{ episode: string; show: string }>;
}

export async function generateMetadata({ params }: PodcastEpisodePageProps): Promise<Metadata> {
  const [{ episode: episodeSegment, show: showSegment }, locale] = await Promise.all([
    params,
    getRequestLocale(),
  ]);
  const show = await loadPodcastShowForSegment(showSegment);
  const episodeId = readSlugSegmentId(episodeSegment);
  const episode = show?.episodes.find(function matchesRoute(showEpisode) {
    return showEpisode.id === episodeId;
  });
  return createPodcastsMetadata({
    description: episode?.description.slice(0, 200) || undefined,
    indexable: episode !== undefined,
    locale,
    path:
      show && episode
        ? getEpisodeHref({ podcast: show.podcast, episode })
        : `/podcasts/${showSegment}/${episodeSegment}`,
    title: episode?.title,
  });
}

export default function PodcastEpisodeRoute({ params }: PodcastEpisodePageProps) {
  const show = params.then(function loadShow({ show: segment }) {
    return loadPodcastShowForSegment(segment);
  });
  const episodeSegment = params.then(function readEpisodeSegment({ episode }) {
    return episode;
  });
  return (
    <>
      <Suspense fallback={<PodcastStackPlaceholder />}>
        <PodcastEpisodeScreen show={show} />
      </Suspense>
      <Suspense fallback={null}>
        <PodcastStructuredData episodeSegment={episodeSegment} show={show} />
      </Suspense>
    </>
  );
}
