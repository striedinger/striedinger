"use client";

import { Text } from "@workspace/ui/components/text";
import { Suspense } from "react";

import type { Podcast } from "./types";

import { IosAppSwitcherButton } from "../../../components/ios/ios-app-switcher-button";
import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";
import { IosScreen } from "../../../components/ios/ios-screen";
import { IosSkeleton } from "../../../components/ios/ios-skeleton";
import { PodcastChartRow } from "./podcast-chart-row";
import { usePodcasts } from "./podcasts-context";
import { PodcastsListeningShelves } from "./podcasts-listening-shelves";
import { podcastsScreenClassName } from "./podcasts-screen";

interface PodcastsHomeScreenProps {
  popular: readonly Podcast[];
}

export function PodcastsHomeScreen({ popular }: PodcastsHomeScreenProps) {
  const { messages } = usePodcasts();
  return (
    <IosScreen className={podcastsScreenClassName}>
      <IosNavigationBar title={messages.Home} leading={<IosAppSwitcherButton />} />
      <div className="flex flex-col gap-7 pt-1">
        <Suspense
          fallback={
            <div aria-hidden="true" className="flex gap-3 overflow-hidden px-4">
              <IosSkeleton className="h-39 w-[min(86vw,420px)] shrink-0 rounded-ios-xl" />
              <IosSkeleton className="h-39 w-[min(86vw,420px)] shrink-0 rounded-ios-xl" />
            </div>
          }
        >
          <PodcastsListeningShelves popular={popular} />
        </Suspense>
        {popular.length > 0 ? (
          <section aria-label={messages["Top Shows"]} className="flex flex-col">
            <Text as="h2" className="px-4 pb-1 text-ios-title2 font-bold text-ios-label">
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
                  />
                );
              })}
            </ol>
          </section>
        ) : null}
        <Text className="px-4 text-ios-footnote text-ios-secondary-label">
          {
            messages[
              "Podcast discovery data is provided by Apple. Audio is streamed directly from each podcast publisher."
            ]
          }
        </Text>
      </div>
    </IosScreen>
  );
}
