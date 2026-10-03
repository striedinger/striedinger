"use client";

import { SearchIcon } from "@workspace/icons/search-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { use, useLayoutEffect } from "react";

import type { PodcastSearchResults } from "./types";

import { IosContentUnavailable } from "../../../components/ios/ios-content-unavailable";
import { PodcastChartRow } from "./podcast-chart-row";
import { normalizeSearchQuery } from "./podcast-route";
import { rememberSearchResults } from "./podcast-search-cache";
import { usePodcasts, usePodcastsSearch } from "./podcasts-context";

interface PodcastsSearchResultListProps {
  results: Promise<PodcastSearchResults> | PodcastSearchResults;
}

/**
 * Top results for a query. While the field leads the URL, as it does during a pending search,
 * the results dim instead of disappearing.
 */
export function PodcastsSearchResultList({ results }: PodcastsSearchResultListProps) {
  const { messages } = usePodcasts();
  const { inputValue } = usePodcastsSearch();
  const resolvedResults = results instanceof Promise ? use(results) : results;
  const isPending = normalizeSearchQuery(inputValue) !== resolvedResults.query;

  useLayoutEffect(
    function keepResultsForNextSearch() {
      rememberSearchResults(resolvedResults);
    },
    [resolvedResults],
  );

  return (
    <section
      aria-label={messages["Top Results"]}
      aria-busy={isPending}
      className={cn("flex flex-col transition-opacity duration-150", isPending && "opacity-60")}
    >
      {resolvedResults.failed ? (
        <Text className="px-8 pt-[14vh] text-center text-[17px] text-(--ios-secondary-label)">
          {messages["Search is unavailable right now. Please try again."]}
        </Text>
      ) : resolvedResults.results.length > 0 ? (
        <>
          <Text
            as="h2"
            className="px-5 pb-1 text-[22px] leading-7 font-bold tracking-[0.35px] text-(--ios-label)"
          >
            {messages["Top Results"]}
          </Text>
          <ul className="m-0 grid list-none grid-cols-1 p-0 pl-4 md:grid-cols-2 md:gap-x-6">
            {resolvedResults.results.map(function renderResult(podcast) {
              return (
                <PodcastChartRow
                  key={podcast.id}
                  podcast={podcast}
                  detail={[podcast.author, podcast.genre].filter(Boolean).join(" · ")}
                />
              );
            })}
          </ul>
        </>
      ) : isPending ? null : (
        <IosContentUnavailable
          icon={<SearchIcon />}
          title={messages["No Results"]}
          description={messages["Check the spelling or try a new search."]}
        />
      )}
    </section>
  );
}
