"use client";

import { CircleXFillIcon } from "@workspace/icons/circle-x-fill-icon";
import { SearchIcon } from "@workspace/icons/search-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { use, useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";

import type { StockIdentity, StocksLabels, StockTimeframe } from "./types";

import { iosGlassClassName, iosStrongGlassClassName } from "../../../components/ios/ios-glass";

interface StockSearchProps {
  initialQuery: string;
  labels: StocksLabels;
  onSelectStock: (stock: StockIdentity) => void;
  /** Suggestions for `initialQuery`, streaming from the server. */
  searchResults: Promise<StockIdentity[]>;
  selectedSymbol: string;
  timeframe: StockTimeframe;
  watchlist: StockIdentity[];
}

const searchDelayMilliseconds = 180;

export function StockSearch({
  initialQuery,
  labels,
  onSelectStock,
  searchResults: searchResultsPromise,
  selectedSymbol,
  timeframe,
  watchlist,
}: StockSearchProps) {
  const searchResults = use(searchResultsPromise);
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [isOpen, setIsOpen] = useState(true);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearching, startSearchNavigation] = useTransition();
  const searchTimeoutRef = useRef<number | null>(null);
  const lastRequestedQueryRef = useRef(normalizeSearchQuery(initialQuery));
  const normalizedQuery = normalizeSearchQuery(query);
  const resultsMatchQuery = normalizedQuery === normalizeSearchQuery(initialQuery);
  const showSuggestions = isOpen && resultsMatchQuery && searchResults.length > 0;
  const activeIndex = highlightedIndex < searchResults.length ? highlightedIndex : -1;

  useEffect(function clearPendingSearchOnUnmount() {
    return function clearPendingSearch() {
      if (searchTimeoutRef.current !== null) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(
    function synchronizeRequestedQuery() {
      lastRequestedQueryRef.current = normalizeSearchQuery(initialQuery);
    },
    [initialQuery],
  );

  function navigateToSearch(nextQuery: string) {
    const normalizedNextQuery = normalizeSearchQuery(nextQuery);
    if (normalizedNextQuery === lastRequestedQueryRef.current) return;
    lastRequestedQueryRef.current = normalizedNextQuery;
    const parameters = new URLSearchParams({ symbol: selectedSymbol, timeframe });
    if (normalizedNextQuery) parameters.set("q", normalizedNextQuery);
    startSearchNavigation(function showServerSuggestions() {
      router.replace(`${pathname}?${parameters}`, { scroll: false });
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

  function chooseStock(stock: StockIdentity) {
    if (searchTimeoutRef.current !== null) {
      window.clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    setQuery("");
    setIsOpen(false);
    setHighlightedIndex(-1);
    onSelectStock(stock);
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
    const selectedResult = showSuggestions
      ? searchResults[activeIndex < 0 ? 0 : activeIndex]
      : null;
    if (selectedResult) {
      chooseStock(selectedResult);
      return;
    }
    navigateToSearch(query);
  }

  return (
    <div className="relative z-20" role="search">
      <label htmlFor="stock-search" className="sr-only">
        {labels.search}
      </label>
      <div className={cn("relative flex h-11 items-center rounded-full", iosGlassClassName)}>
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 size-4.5 text-ios-secondary-label"
          strokeWidth={2.4}
        />
        <input
          id="stock-search"
          name="q"
          type="text"
          role="combobox"
          tabIndex={0}
          inputMode="search"
          enterKeyHint="search"
          value={query}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-busy={isSearching}
          aria-controls="stock-suggestions"
          aria-expanded={showSuggestions}
          aria-activedescendant={activeIndex >= 0 ? `stock-suggestion-${activeIndex}` : undefined}
          aria-describedby="stock-search-help"
          placeholder={labels.searchPlaceholder}
          className="size-full min-w-0 rounded-full bg-transparent pr-16 pl-10 text-ios-body text-ios-label outline-none placeholder:text-ios-secondary-label"
          onFocus={function openSuggestions() {
            setIsOpen(true);
          }}
          onChange={function updateQuery(event) {
            const nextQuery = event.currentTarget.value;
            setQuery(nextQuery);
            setIsOpen(true);
            setHighlightedIndex(-1);
            scheduleSearch(nextQuery);
          }}
          onKeyDown={handleSearchKeys}
        />
        {isSearching ? (
          <span
            aria-hidden="true"
            className="absolute right-10 size-3.5 animate-spin rounded-full border-2 border-ios-secondary-label border-r-transparent motion-reduce:animate-none"
          />
        ) : null}
        {query ? (
          <button
            type="button"
            aria-label={labels.close}
            className="absolute right-2 flex size-7 items-center justify-center rounded-full text-ios-tertiary-label outline-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 active:opacity-60 [&_svg]:size-4.5"
            onClick={function clearSearch() {
              setQuery("");
              setIsOpen(false);
              setHighlightedIndex(-1);
              navigateToSearch("");
            }}
          >
            <CircleXFillIcon />
          </button>
        ) : null}
      </div>
      <span id="stock-search-help" className="sr-only">
        {labels.searchHelp}
      </span>

      {showSuggestions ? (
        <div
          id="stock-suggestions"
          role="listbox"
          className={cn(
            "absolute top-[calc(100%+0.5rem)] right-0 left-0 max-h-80 overflow-y-auto rounded-ios-xl p-1.5",
            iosStrongGlassClassName,
          )}
        >
          {searchResults.map(function renderSuggestion(stock, index) {
            const isAdded = watchlist.some(function hasSymbol(item) {
              return item.symbol === stock.symbol;
            });
            const isHighlighted = index === activeIndex;
            return (
              <div key={`${stock.symbol}-${stock.exchange}`} role="none">
                <button
                  id={`stock-suggestion-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isHighlighted}
                  className="flex w-full items-center justify-between gap-3 rounded-ios-lg px-3 py-2.5 text-left outline-none aria-selected:bg-ios-fill"
                  onPointerEnter={function highlightSuggestion() {
                    setHighlightedIndex(index);
                  }}
                  onClick={function chooseSuggestion() {
                    chooseStock(stock);
                  }}
                >
                  <span className="min-w-0">
                    <Text as="span" className="block text-ios-body font-semibold text-ios-label">
                      {stock.symbol}
                    </Text>
                    <Text
                      as="span"
                      numberOfLines={1}
                      className="block text-ios-footnote text-ios-secondary-label"
                    >
                      {stock.name} · {stock.exchange}
                    </Text>
                  </span>
                  <Text
                    as="span"
                    className={cn(
                      "shrink-0 text-ios-subheadline font-semibold",
                      isAdded ? "text-ios-secondary-label" : "text-ios-tint",
                    )}
                  >
                    {isAdded ? labels.added : labels.add}
                  </Text>
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function normalizeSearchQuery(query: string) {
  return query.trim().replace(/\s+/g, " ").slice(0, 40);
}
