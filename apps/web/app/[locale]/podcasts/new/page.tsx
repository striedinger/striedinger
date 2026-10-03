import type { Metadata } from "next";

import { getRequestLocale } from "../../../get-request-locale";
import { readSearchParameter } from "../podcast-route";
import { loadNewEpisodes } from "../podcasts-data";
import { createPodcastsMetadata } from "../podcasts-metadata";
import { PodcastsNewScreen } from "../podcasts-new-screen";

interface PodcastsNewPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  return createPodcastsMetadata({
    indexable: false,
    locale: await getRequestLocale(),
    path: "/podcasts/new",
  });
}

export default function PodcastsNewPage({ searchParams }: PodcastsNewPageProps) {
  const episodes = searchParams.then(function loadEpisodesForShows(parameters) {
    return loadNewEpisodes(readSearchParameter(parameters.shows));
  });
  return <PodcastsNewScreen episodes={episodes} />;
}
