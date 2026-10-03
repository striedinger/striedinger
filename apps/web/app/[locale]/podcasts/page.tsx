import type { Metadata, Viewport } from "next";

import { Suspense } from "react";

import { IosAppFrame } from "../../../components/ios/ios-app-frame";
import { createPageMetadata } from "../../../lib/seo";
import { getPodcastTranslator } from "../../../messages/podcasts/get-translator";
import { getRequestLocale } from "../../get-request-locale";
import { podcastsFrameClassName } from "./podcasts-frame";
import { PodcastsLoader } from "./podcasts-loader";
import { PodcastsSkeleton } from "./podcasts-skeleton";

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getPodcastTranslator(locale);
  return createPageMetadata({
    title: translate("Podcasts"),
    description: translate(
      "Discover shows, follow your favorites, and listen with a familiar player. Your library stays on this device.",
    ),
    locale,
    path: "/podcasts",
  });
}

interface PodcastsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function PodcastsPage({ searchParams }: PodcastsPageProps) {
  return (
    <IosAppFrame className={podcastsFrameClassName}>
      <Suspense fallback={<PodcastsSkeleton />}>
        <PodcastsLoader searchParams={searchParams} />
      </Suspense>
    </IosAppFrame>
  );
}
