import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { getRequestLocale } from "../../../../get-request-locale";
import { isLibraryView, libraryViews } from "../../podcast-route";
import { PodcastsLibraryScreen } from "../../podcasts-library-screen";
import { createPodcastsMetadata } from "../../podcasts-metadata";

interface PodcastsLibraryViewPageProps {
  params: Promise<{ view: string }>;
}

export function generateStaticParams() {
  return libraryViews.map(function createParams(view) {
    return { view };
  });
}

export async function generateMetadata({
  params,
}: PodcastsLibraryViewPageProps): Promise<Metadata> {
  const [{ view }, locale] = await Promise.all([params, getRequestLocale()]);
  return createPodcastsMetadata({
    indexable: false,
    locale,
    path: `/podcasts/library/${view}`,
  });
}

export default async function PodcastsLibraryViewPage({ params }: PodcastsLibraryViewPageProps) {
  const { view } = await params;
  if (!isLibraryView(view)) notFound();
  return <PodcastsLibraryScreen view={view} />;
}
