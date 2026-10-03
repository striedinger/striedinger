import type { Metadata } from "next";

import { Suspense } from "react";

import { getRequestLocale } from "../../../../get-request-locale";
import { PodcastShowScreen } from "../../podcast-show-screen";
import { PodcastStackPlaceholder } from "../../podcast-stack-placeholder";
import { loadPodcastShow } from "../../podcasts-data";
import { createPodcastsMetadata } from "../../podcasts-metadata";

interface PodcastShowPageProps {
  params: Promise<{ showId: string }>;
}

export async function generateMetadata({ params }: PodcastShowPageProps): Promise<Metadata> {
  const [{ showId }, locale] = await Promise.all([params, getRequestLocale()]);
  const show = await loadPodcastShow(showId);
  return createPodcastsMetadata({
    description: show ? `${show.podcast.author} · ${show.podcast.genre}` : undefined,
    indexable: show !== null,
    locale,
    path: `/podcasts/show/${showId}`,
    title: show?.podcast.title,
  });
}

export default function PodcastShowRoute({ params }: PodcastShowPageProps) {
  // The screen renders from what the app already knows while the show streams in.
  const show = params.then(function loadShow({ showId }) {
    return loadPodcastShow(showId);
  });
  return (
    <Suspense fallback={<PodcastStackPlaceholder />}>
      <PodcastShowScreen show={show} />
    </Suspense>
  );
}
