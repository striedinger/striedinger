"use client";

import { IosSkeleton } from "../../../components/ios/ios-skeleton";
import { readLatestSearchResults } from "./podcast-search-cache";
import { PodcastsSearchResultList } from "./podcasts-search-result-list";

const placeholderRows = [0, 1, 2, 3, 4, 5];

/**
 * Each query is its own URL, so a new search renders a new screen. Until its results arrive,
 * it shows the previous results dimmed, the way the search field updates results in place,
 * or placeholder rows for the first search.
 */
export function PodcastsSearchResultsPlaceholder() {
  const previousResults = readLatestSearchResults();
  if (previousResults) return <PodcastsSearchResultList results={previousResults} />;
  return (
    <div aria-busy="true" className="flex flex-col gap-3 px-4 pt-2">
      <IosSkeleton className="mb-1 h-7 w-36" />
      {placeholderRows.map(function renderRow(row) {
        return (
          <div key={row} className="flex items-center gap-3">
            <IosSkeleton className="size-16 shrink-0 rounded-md" />
            <div className="flex flex-1 flex-col gap-2">
              <IosSkeleton className="h-4 w-3/5" />
              <IosSkeleton className="h-3 w-2/5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
