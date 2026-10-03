"use client";

import { SearchIcon } from "@workspace/icons/search-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

import type { Podcast, PodcastMessages } from "./types";

import { IosContentUnavailable } from "../../../components/ios/ios-content-unavailable";
import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";
import { getPodcastCategories } from "./podcast-categories";
import { PodcastChartRow } from "./podcast-chart-row";
import { normalizeSearchQuery } from "./podcast-route";

interface PodcastsSearchTabProps {
  onShareShow: (podcast: Podcast) => void;
  getShowHref: (podcast: Podcast) => string;
  inputValue: string;
  isSearching: boolean;
  messages: PodcastMessages;
  onOpenShow: (podcast: Podcast) => void;
  onSearchCategory: (searchTerm: string) => void;
  query: string;
  results: readonly Podcast[];
  searchFailed: boolean;
}

export function PodcastsSearchTab({
  getShowHref,
  inputValue,
  isSearching,
  messages,
  onOpenShow,
  onSearchCategory,
  query,
  results,
  searchFailed,
  onShareShow,
}: PodcastsSearchTabProps) {
  const normalizedInput = normalizeSearchQuery(inputValue);
  const categories = getPodcastCategories(messages);

  return (
    <div
      data-ios-scroll
      className="flex h-full flex-col overflow-y-auto overscroll-contain pb-44 md:pb-32"
    >
      <IosNavigationBar title={messages.Search} />
      {normalizedInput ? (
        <section
          aria-label={messages["Top Results"]}
          aria-busy={isSearching}
          className={cn(
            "flex flex-col transition-opacity duration-150",
            isSearching && "opacity-60",
          )}
        >
          {searchFailed ? (
            <Text className="px-8 pt-[14vh] text-center text-[17px] text-(--ios-secondary-label)">
              {messages["Search is unavailable right now. Please try again."]}
            </Text>
          ) : results.length > 0 ? (
            <>
              <Text
                as="h2"
                className="px-5 pb-1 text-[22px] leading-7 font-bold tracking-[0.35px] text-(--ios-label)"
              >
                {messages["Top Results"]}
              </Text>
              <ul className="m-0 grid list-none grid-cols-1 p-0 pl-4 md:grid-cols-2 md:gap-x-6">
                {results.map(function renderResult(podcast) {
                  return (
                    <PodcastChartRow
                      messages={messages}
                      onShare={onShareShow}
                      key={podcast.id}
                      podcast={podcast}
                      detail={[podcast.author, podcast.genre].filter(Boolean).join(" · ")}
                      href={getShowHref(podcast)}
                      onOpen={onOpenShow}
                    />
                  );
                })}
              </ul>
            </>
          ) : isSearching || normalizedInput !== query ? null : (
            <IosContentUnavailable
              icon={<SearchIcon />}
              title={messages["No Results"]}
              description={messages["Check the spelling or try a new search."]}
            />
          )}
        </section>
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
                      onSearchCategory(category.searchTerm);
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
    </div>
  );
}
