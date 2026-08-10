import type { Metadata } from "next";

import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Text } from "@workspace/ui/components/text";
import { Suspense } from "react";

import { JsonLd } from "../../components/json-ld";
import { ToolDetails } from "../../components/tool-details";
import { createPageMetadata, createWebApplicationStructuredData } from "../../lib/seo";
import { getTranslator } from "../../messages/get-translator";
import { getPodcastTranslator } from "../../messages/podcasts/get-translator";
import { loadPodcastMessages } from "../../messages/podcasts/load-messages";
import { getRequestLocale } from "../get-request-locale";
import { PodcastsExplorerLoader } from "./podcasts-explorer-loader";
import { PodcastsExplorerSkeleton } from "./podcasts-explorer-skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getPodcastTranslator(locale);
  const title = translate("Podcast Search and Player");
  const description = translate(
    "Find a show, save it for later, and listen without creating an account.",
  );
  return createPageMetadata({ title, description, locale, path: "/podcasts" });
}

interface PodcastsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PodcastsPage({ searchParams }: PodcastsPageProps) {
  const [locale, resolvedSearchParams] = await Promise.all([getRequestLocale(), searchParams]);
  const initialQuery = normalizeQuery(singleValue(resolvedSearchParams.q));
  const podcastId = normalizeId(singleValue(resolvedSearchParams.podcast));
  const initialEpisodeId = normalizeId(singleValue(resolvedSearchParams.episode));
  const [messages, translate] = await Promise.all([
    loadPodcastMessages(locale),
    getTranslator(locale),
  ]);
  const structuredData = createWebApplicationStructuredData({
    name: messages["Podcasts"],
    description:
      messages["Find a show, save it for later, and listen without creating an account."],
    applicationCategory: "MultimediaApplication",
    browserRequirements: "Requires JavaScript",
    featureList: [
      messages["Search shows, people, or topics"],
      messages["Local library"],
      messages["Now playing"],
      messages["In progress"],
    ],
    locale,
    path: "/podcasts",
  });

  return (
    <PageShell>
      <JsonLd value={structuredData} />
      <PageContainer>
        <PageHeader
          title={messages["Podcasts"]}
          description={
            messages["Find a show, save it for later, and listen without creating an account."]
          }
          eyebrow={
            <div className="flex items-center gap-3">
              <span
                className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="size-5"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M8 7a4 4 0 0 1 8 0v4a4 4 0 0 1-8 0V7Z" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
                </svg>
              </span>
              <Text as="span" size="xs" weight="bold" className="tracking-[0.2em] uppercase">
                {messages["Local library"]}
              </Text>
            </div>
          }
        />
        <Suspense fallback={<PodcastsExplorerSkeleton />}>
          <PodcastsExplorerLoader
            initialEpisodeId={initialEpisodeId}
            initialQuery={initialQuery}
            locale={locale}
            messages={messages}
            podcastId={podcastId}
          />
        </Suspense>
        <ToolDetails
          title={translate("About this tool")}
          description={
            messages["Find a show, save it for later, and listen without creating an account."]
          }
          sections={[
            {
              title: translate("How it works"),
              description: messages["Search shows, people, or topics"],
              items: [messages.Search, messages.Explore, messages["Show episodes"]],
            },
            {
              title: translate("Local storage"),
              description: messages["Your library stays on this device."],
              items: [messages["Your library"], messages["In progress"], messages.Resume],
            },
            {
              title: translate("Live data"),
              description:
                messages[
                  "Podcast discovery data is provided by Apple. Audio is streamed directly from each podcast publisher. Downloads depend on the publisher and your browser."
                ],
              items: [
                messages["Popular right now"],
                messages["Latest episodes"],
                messages["Download episode"],
              ],
            },
          ]}
        />
        <footer className="border-t py-8">
          <Text size="xs" tone="muted">
            {
              messages[
                "Podcast discovery data is provided by Apple. Audio is streamed directly from each podcast publisher. Downloads depend on the publisher and your browser."
              ]
            }
          </Text>
        </footer>
      </PageContainer>
    </PageShell>
  );
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeId(value: string | undefined) {
  const normalizedValue = value?.trim() ?? "";
  return /^\d{1,20}$/.test(normalizedValue) ? normalizedValue : "";
}

function normalizeQuery(value: string | undefined) {
  const normalizedValue = value?.trim().replace(/\s+/g, " ").slice(0, 80) ?? "";
  return normalizedValue.length >= 2 ? normalizedValue : "";
}
