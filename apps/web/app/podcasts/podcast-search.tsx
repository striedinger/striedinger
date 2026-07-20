"use client";

import { CloseIcon } from "@workspace/icons/close-icon";
import { Input } from "@workspace/ui/components/input";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";

import type { Podcast, PodcastMessages } from "./types";

import { getPodcastHref, getPodcastSearchHref } from "./podcast-links";

interface PodcastSearchProps {
  initialQuery: string;
  messages: PodcastMessages;
  searchResults: Podcast[];
}

interface QueryState {
  initialQuery: string;
  value: string;
}

const searchDelayMilliseconds = 180;

export function PodcastSearch({ initialQuery, messages, searchResults }: PodcastSearchProps) {
  const router = useRouter();
  const [queryState, setQueryState] = useState<QueryState>({ initialQuery, value: initialQuery });
  const [isOpen, setIsOpen] = useState(true);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearching, startSearchNavigation] = useTransition();
  const searchTimeoutRef = useRef<number | null>(null);
  const lastRequestedQueryRef = useRef(getNavigableQuery(initialQuery));
  if (queryState.initialQuery !== initialQuery) {
    setQueryState({ initialQuery, value: initialQuery });
  }
  const query = queryState.initialQuery === initialQuery ? queryState.value : initialQuery;
  const normalizedQuery = normalizeSearchQuery(query);
  const resultsMatchQuery = normalizedQuery === normalizeSearchQuery(initialQuery);
  const showSuggestions =
    isOpen && normalizedQuery.length >= 2 && resultsMatchQuery && searchResults.length > 0;
  const activeIndex = highlightedIndex < searchResults.length ? highlightedIndex : -1;

  useEffect(function clearPendingSearchOnUnmount() {
    return function cancelPendingSearch() {
      if (searchTimeoutRef.current !== null) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(
    function synchronizeRequestedQuery() {
      lastRequestedQueryRef.current = getNavigableQuery(initialQuery);
    },
    [initialQuery],
  );

  function navigateToSearch(nextQuery: string) {
    const navigableQuery = getNavigableQuery(nextQuery);
    if (navigableQuery === lastRequestedQueryRef.current) return;
    lastRequestedQueryRef.current = navigableQuery;
    startSearchNavigation(function showServerSuggestions() {
      router.replace(navigableQuery ? getPodcastSearchHref(navigableQuery) : "/podcasts", {
        scroll: false,
      });
    });
  }

  function scheduleSearch(nextQuery: string) {
    if (searchTimeoutRef.current !== null) {
      window.clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = window.setTimeout(function requestServerSuggestions() {
      searchTimeoutRef.current = null;
      navigateToSearch(nextQuery);
    }, searchDelayMilliseconds);
  }

  function clearPendingSearch() {
    if (searchTimeoutRef.current === null) return;
    window.clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = null;
  }

  function choosePodcast(podcast: Podcast) {
    clearPendingSearch();
    setQueryState({ initialQuery, value: "" });
    setIsOpen(false);
    setHighlightedIndex(-1);
    startSearchNavigation(function showPodcast() {
      router.push(getPodcastHref(podcast.id), { scroll: false });
    });
  }

  function handleSearchKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && showSuggestions) {
      event.preventDefault();
      setHighlightedIndex(activeIndex >= searchResults.length - 1 ? 0 : activeIndex + 1);
      return;
    }
    if (event.key === "ArrowUp" && showSuggestions) {
      event.preventDefault();
      setHighlightedIndex(activeIndex <= 0 ? searchResults.length - 1 : activeIndex - 1);
      return;
    }
    if (event.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    clearPendingSearch();
    const selectedResult = showSuggestions
      ? searchResults[activeIndex < 0 ? 0 : activeIndex]
      : null;
    if (selectedResult) {
      choosePodcast(selectedResult);
      return;
    }
    navigateToSearch(query);
  }

  return (
    <Surface className="relative z-20 p-3 sm:p-4">
      <div role="search">
        <label htmlFor="podcast-search" className="sr-only">
          {messages["Search"]}
        </label>
        <div className="relative min-w-0">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.8-3.8" />
          </svg>
          <Input
            id="podcast-search"
            name="q"
            type="text"
            role="combobox"
            tabIndex={0}
            inputMode="search"
            enterKeyHint="search"
            value={query}
            maxLength={80}
            autoComplete="off"
            aria-autocomplete="list"
            aria-busy={isSearching}
            aria-controls="podcast-suggestions"
            aria-expanded={showSuggestions}
            aria-activedescendant={
              activeIndex >= 0 ? `podcast-suggestion-${activeIndex}` : undefined
            }
            placeholder={messages["Search shows, people, or topics"]}
            className="h-11 rounded-xl pr-18 pl-9"
            onFocus={function openSuggestions() {
              setIsOpen(true);
            }}
            onChange={function updateQuery(event) {
              const nextQuery = event.currentTarget.value;
              setQueryState({ initialQuery, value: nextQuery });
              setIsOpen(true);
              setHighlightedIndex(-1);
              scheduleSearch(nextQuery);
            }}
            onKeyDown={handleSearchKeys}
          />
          {isSearching ? (
            <span
              aria-hidden="true"
              className="absolute top-1/2 right-10 size-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-muted-foreground border-r-transparent motion-reduce:animate-none"
            />
          ) : null}
          {query ? (
            <button
              type="button"
              aria-label={messages["Clear search"]}
              className="absolute top-1/2 right-1 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              onClick={function clearSearch() {
                clearPendingSearch();
                setQueryState({ initialQuery, value: "" });
                setIsOpen(false);
                setHighlightedIndex(-1);
                navigateToSearch("");
              }}
            >
              <CloseIcon className="size-4" />
            </button>
          ) : null}

          {showSuggestions ? (
            <Surface
              as="ul"
              id="podcast-suggestions"
              role="listbox"
              className="absolute top-[calc(100%+0.5rem)] right-0 left-0 max-h-80 list-none overflow-y-auto p-1 shadow-raised"
            >
              {searchResults.map(function renderSuggestion(podcast, index) {
                const isHighlighted = index === activeIndex;
                return (
                  <li key={podcast.id} role="none">
                    <Link
                      id={`podcast-suggestion-${index}`}
                      href={getPodcastHref(podcast.id)}
                      scroll={false}
                      role="option"
                      aria-selected={isHighlighted}
                      className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none aria-selected:bg-accent"
                      onPointerEnter={function highlightSuggestion() {
                        setHighlightedIndex(index);
                      }}
                      onClick={function closeSuggestions() {
                        clearPendingSearch();
                        setQueryState({ initialQuery, value: "" });
                        setIsOpen(false);
                        setHighlightedIndex(-1);
                      }}
                    >
                      <span className="min-w-0">
                        <Text as="span" size="sm" weight="semibold" numberOfLines={1}>
                          {podcast.title}
                        </Text>
                        <Text as="span" size="xs" tone="muted" numberOfLines={1} className="block">
                          {podcast.author}
                        </Text>
                      </span>
                      {podcast.genre ? (
                        <Text as="span" size="xs" tone="muted" className="shrink-0">
                          {podcast.genre}
                        </Text>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </Surface>
          ) : null}
        </div>
      </div>
    </Surface>
  );
}

function getNavigableQuery(query: string) {
  const normalizedQuery = normalizeSearchQuery(query);
  return normalizedQuery.length >= 2 ? normalizedQuery : "";
}

function normalizeSearchQuery(query: string) {
  return query.trim().replace(/\s+/g, " ").slice(0, 80);
}
