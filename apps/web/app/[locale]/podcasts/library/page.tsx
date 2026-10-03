import type { Metadata } from "next";

import { getRequestLocale } from "../../../get-request-locale";
import { PodcastsLibraryScreen } from "../podcasts-library-screen";
import { createPodcastsMetadata } from "../podcasts-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return createPodcastsMetadata({
    indexable: false,
    locale: await getRequestLocale(),
    path: "/podcasts/library",
  });
}

export default function PodcastsLibraryPage() {
  return <PodcastsLibraryScreen view={null} />;
}
