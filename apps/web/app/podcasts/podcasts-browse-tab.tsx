"use client";

import { Text } from "@workspace/ui/components/text";

import type { Podcast, PodcastMessages } from "./types";

import { IosNavigationBar } from "../../components/ios/ios-navigation-bar";
import { FeaturedPodcastCard } from "./featured-podcast-card";
import { PodcastChartRow } from "./podcast-chart-row";

interface PodcastsBrowseTabProps {
  getShowHref: (podcast: Podcast) => string;
  messages: PodcastMessages;
  onOpenShow: (podcast: Podcast) => void;
  popular: readonly Podcast[];
}

export function PodcastsBrowseTab({
  getShowHref,
  messages,
  onOpenShow,
  popular,
}: PodcastsBrowseTabProps) {
  const featured = popular.slice(0, 5);

  return (
    <div
      data-ios-scroll
      className="flex h-full flex-col overflow-y-auto overscroll-contain pb-44 md:pb-32"
    >
      <IosNavigationBar title={messages.Browse} />
      <div className="flex flex-col gap-7 pt-1">
        {featured.length > 0 ? (
          <ul
            aria-label={messages["Top Shows"]}
            className="m-0 flex snap-x snap-mandatory scroll-px-4 list-none gap-3 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {featured.map(function renderFeatured(podcast, index) {
              return (
                <FeaturedPodcastCard
                  key={podcast.id}
                  podcast={podcast}
                  href={getShowHref(podcast)}
                  priority={index === 0}
                  onOpen={onOpenShow}
                />
              );
            })}
          </ul>
        ) : null}
        <section aria-label={messages["Top Shows"]} className="flex flex-col">
          <Text
            as="h2"
            className="px-4 pb-1 text-[22px] leading-7 font-bold tracking-[0.35px] text-(--ios-label)"
          >
            {messages["Top Shows"]}
          </Text>
          <ol className="m-0 grid list-none grid-cols-1 p-0 pl-4 md:grid-cols-2 md:gap-x-6 xl:grid-cols-3">
            {popular.map(function renderChartRow(podcast, index) {
              return (
                <PodcastChartRow
                  key={podcast.id}
                  podcast={podcast}
                  rank={index + 1}
                  detail={podcast.genre || podcast.author}
                  href={getShowHref(podcast)}
                  onOpen={onOpenShow}
                />
              );
            })}
          </ol>
        </section>
        <Text className="px-4 text-[13px] leading-[18px] text-(--ios-secondary-label)">
          {
            messages[
              "Podcast discovery data is provided by Apple. Audio is streamed directly from each podcast publisher."
            ]
          }
        </Text>
      </div>
    </div>
  );
}
