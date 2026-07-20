"use client";

import { CloseIcon } from "@workspace/icons/close-icon";
import { Input } from "@workspace/ui/components/input";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";

import type { StockIdentity, StocksLabels, StockTimeframe } from "./types";

interface StockSearchProps {
  initialQuery: string;
  labels: StocksLabels;
  onSelectStock: (stock: StockIdentity) => void;
  searchResults: StockIdentity[];
  selectedSymbol: string;
  timeframe: StockTimeframe;
  watchlist: StockIdentity[];
}

const searchDelayMilliseconds = 180;

export function StockSearch({
  initialQuery,
  labels,
  onSelectStock,
  searchResults,
  selectedSymbol,
  timeframe,
  watchlist,
}: StockSearchProps) {
  const router = useRouter();
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
      router.replace(`/stocks?${parameters}`, { scroll: false });
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
      <div className="relative">
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
          id="stock-search"
          name="q"
          type="text"
          role="combobox"
          tabIndex={0}
          inputMode="search"
          enterKeyHint="search"
          value={query}
          autoComplete="off"
          aria-autocomplete="list"
          aria-busy={isSearching}
          aria-controls="stock-suggestions"
          aria-expanded={showSuggestions}
          aria-activedescendant={activeIndex >= 0 ? `stock-suggestion-${activeIndex}` : undefined}
          placeholder={labels.searchPlaceholder}
          className="h-11 rounded-xl pr-18 pl-9"
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
            className="absolute top-1/2 right-10 size-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-muted-foreground border-r-transparent motion-reduce:animate-none"
          />
        ) : null}
        {query ? (
          <button
            type="button"
            aria-label={labels.close}
            className="absolute top-1/2 right-1 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            onClick={function clearSearch() {
              setQuery("");
              setIsOpen(false);
              setHighlightedIndex(-1);
              navigateToSearch("");
            }}
          >
            <CloseIcon className="size-4" />
          </button>
        ) : null}
      </div>

      {showSuggestions ? (
        <Surface
          as="ul"
          id="stock-suggestions"
          role="listbox"
          className="absolute top-[calc(100%+0.5rem)] right-0 left-0 max-h-80 list-none overflow-y-auto p-1 shadow-raised"
        >
          {searchResults.map(function renderSuggestion(stock, index) {
            const isAdded = watchlist.some(function hasSymbol(item) {
              return item.symbol === stock.symbol;
            });
            const isHighlighted = index === activeIndex;
            return (
              <li key={`${stock.symbol}-${stock.exchange}`} role="none">
                <button
                  id={`stock-suggestion-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isHighlighted}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none aria-selected:bg-accent"
                  onPointerEnter={function highlightSuggestion() {
                    setHighlightedIndex(index);
                  }}
                  onClick={function chooseSuggestion() {
                    chooseStock(stock);
                  }}
                >
                  <span className="min-w-0">
                    <Text as="span" size="sm" weight="semibold">
                      {stock.symbol}
                    </Text>
                    <Text as="span" size="xs" tone="muted" numberOfLines={1} className="block">
                      {stock.name} · {stock.exchange}
                    </Text>
                  </span>
                  <Text as="span" size="xs" tone="muted">
                    {isAdded ? labels.added : labels.add}
                  </Text>
                </button>
              </li>
            );
          })}
        </Surface>
      ) : null}
      <Text size="xs" tone="muted" className="px-1 pt-2">
        {labels.searchHelp}
      </Text>
    </div>
  );
}

function normalizeSearchQuery(query: string) {
  return query.trim().replace(/\s+/g, " ").slice(0, 40);
}
