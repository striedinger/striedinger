import type { Metadata } from "next";

import { getRequestLocale } from "../../../get-request-locale";
import { readSearchParameter } from "../podcast-route";
import { loadSearchResults } from "../podcasts-data";
import { createPodcastsMetadata } from "../podcasts-metadata";
import { PodcastsSearchScreen } from "../podcasts-search-screen";

interface PodcastsSearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return createPodcastsMetadata({ indexable: false, locale, path: "/podcasts/search" });
}

export default function PodcastsSearchPage({ searchParams }: PodcastsSearchPageProps) {
  const results = searchParams.then(function searchCatalog(parameters) {
    return loadSearchResults(readSearchParameter(parameters.q));
  });
  return <PodcastsSearchScreen results={results} />;
}
