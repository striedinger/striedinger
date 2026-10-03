"use client";

import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { Suspense } from "react";

import type { PodcastSearchResults } from "./types";

import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";
import { IosScreen } from "../../../components/ios/ios-screen";
import { getPodcastCategories } from "./podcast-categories";
import { normalizeSearchQuery } from "./podcast-route";
import { usePodcasts, usePodcastsSearch } from "./podcasts-context";
import { podcastsScreenClassName } from "./podcasts-screen";
import { PodcastsSearchResultList } from "./podcasts-search-result-list";
import { PodcastsSearchResultsPlaceholder } from "./podcasts-search-results-placeholder";

interface PodcastsSearchScreenProps {
  /** Results for the query in the URL, streaming from the server. */
  results: Promise<PodcastSearchResults>;
}

export function PodcastsSearchScreen({ results }: PodcastsSearchScreenProps) {
  const { messages } = usePodcasts();
  const { inputValue, searchNow } = usePodcastsSearch();
  const categories = getPodcastCategories(messages);

  return (
    <IosScreen className={podcastsScreenClassName}>
      <IosNavigationBar title={messages.Search} />
      {normalizeSearchQuery(inputValue) ? (
        <Suspense fallback={<PodcastsSearchResultsPlaceholder />}>
          <PodcastsSearchResultList results={results} />
        </Suspense>
      ) : (
        <section aria-label={messages["Browse Categories"]} className="flex flex-col gap-3">
          <Text
            as="h2"
            className="px-5 text-[22px] leading-7 font-bold tracking-[0.35px] text-(--ios-label)"
          >
            {messages["Browse Categories"]}
          </Text>
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 px-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map(function renderCategory(category) {
              return (
                <li key={category.searchTerm}>
                  <button
                    type="button"
                    className={cn(
                      "relative flex aspect-[1.55] w-full items-end overflow-hidden rounded-[22px] bg-linear-to-br from-white/0 p-3.5 text-left text-[17px] leading-[21px] font-bold text-white shadow-[inset_0_0.5px_0_0.5px_rgb(255_255_255/0.25)] outline-none before:pointer-events-none before:absolute before:inset-0 before:bg-linear-to-br before:from-white/25 before:via-white/0 before:to-black/15 hover:brightness-105 focus-visible:ring-2 focus-visible:ring-(--ios-tint) focus-visible:ring-offset-2 active:scale-[0.97] motion-safe:transition-transform",
                      category.colorClassName,
                    )}
                    onClick={function searchCategory() {
                      searchNow(category.searchTerm);
                    }}
                  >
                    <span className="relative">{category.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </IosScreen>
  );
}
