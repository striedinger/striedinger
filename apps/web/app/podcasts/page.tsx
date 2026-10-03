import type { Metadata } from "next";

import { Suspense } from "react";

import { IosAppFrame } from "../../components/ios/ios-app-frame";
import { createPageMetadata } from "../../lib/seo";
import { getPodcastTranslator } from "../../messages/podcasts/get-translator";
import { getRequestLocale } from "../get-request-locale";
import { PodcastsLoader } from "./podcasts-loader";

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
    <IosAppFrame className="[--ios-tint:#9440d8] dark:[--ios-tint:#c47bf5]">
      <Suspense fallback={<div aria-busy="true" className="size-full bg-(--ios-background)" />}>
        <PodcastsLoader searchParams={searchParams} />
      </Suspense>
    </IosAppFrame>
  );
}
