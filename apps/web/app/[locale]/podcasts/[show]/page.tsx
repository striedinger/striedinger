import type { Metadata } from "next";

import { Suspense } from "react";

import { getRequestLocale } from "../../../get-request-locale";
import { getShowHref } from "../podcast-route";
import { PodcastShowScreen } from "../podcast-show-screen";
import { PodcastStackPlaceholder } from "../podcast-stack-placeholder";
import { loadPodcastShowForSegment } from "../podcasts-data";
import { createPodcastsMetadata } from "../podcasts-metadata";

interface PodcastShowPageProps {
  params: Promise<{ show: string }>;
}

export async function generateMetadata({ params }: PodcastShowPageProps): Promise<Metadata> {
  const [{ show: segment }, locale] = await Promise.all([params, getRequestLocale()]);
  const show = await loadPodcastShowForSegment(segment);
  return createPodcastsMetadata({
    description: show ? `${show.podcast.author} · ${show.podcast.genre}` : undefined,
    indexable: show !== null,
    locale,
    path: show ? getShowHref(show.podcast) : `/podcasts/${segment}`,
    title: show?.podcast.title,
  });
}

export default function PodcastShowRoute({ params }: PodcastShowPageProps) {
  // The screen renders from what the app already knows while the show streams in.
  const show = params.then(function loadShow({ show: segment }) {
    return loadPodcastShowForSegment(segment);
  });
  return (
    <Suspense fallback={<PodcastStackPlaceholder />}>
      <PodcastShowScreen show={show} />
    </Suspense>
  );
}
