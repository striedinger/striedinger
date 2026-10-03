"use client";

import { useEffect, useRef, useState } from "react";

import { normalizeSearchQuery } from "./podcast-route";

interface InputState {
  query: string;
  value: string;
}

const searchDelayMilliseconds = 280;

/**
 * Keeps the search field responsive while debouncing URL-driven server searches. The field
 * follows the server query when it changes elsewhere, such as browser navigation.
 */
export function useSearchInput(query: string, onSearch: (query: string) => void) {
  const [inputState, setInputState] = useState<InputState>({ query, value: query });
  const searchTimeoutRef = useRef<number | null>(null);
  if (inputState.query !== query && normalizeSearchQuery(inputState.value) !== query) {
    setInputState({ query, value: query });
  }

  useEffect(function cancelPendingSearch() {
    return function clearSearchTimeout() {
      if (searchTimeoutRef.current !== null) window.clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  function clearPendingSearch() {
    if (searchTimeoutRef.current === null) return;
    window.clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = null;
  }

  function updateValue(value: string) {
    setInputState({ query, value });
    clearPendingSearch();
    searchTimeoutRef.current = window.setTimeout(function runSearch() {
      searchTimeoutRef.current = null;
      onSearch(normalizeSearchQuery(value));
    }, searchDelayMilliseconds);
  }

  function searchNow(value: string) {
    clearPendingSearch();
    setInputState({ query, value });
    onSearch(normalizeSearchQuery(value));
  }

  return { searchNow, updateValue, value: inputState.value };
}
