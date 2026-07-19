"use client";

import { useDeferredValue, useEffect, useRef, useState, type KeyboardEvent } from "react";

export type TypeaheadStatus = "idle" | "loading" | "error";

interface UseTypeaheadOptions<Item> {
  clearQueryOnSelect?: boolean;
  initialQuery?: string;
  loadResults?: (query: string) => Promise<readonly Item[]>;
  loadSuggestions: (query: string) => Promise<readonly Item[]>;
  maximumSuggestions?: number;
  minimumQueryLength?: number;
  minimumSuggestionLength?: number;
  normalizeQuery?: (query: string) => string;
  onQueryChange?: (query: string) => void;
  onResults?: (results: readonly Item[], query: string) => void;
  onSelect?: (item: Item) => void;
  query?: string;
  suggestionDelayMilliseconds?: number;
}

interface UseTypeaheadResult<Item> {
  activateSuggestion: (index: number) => void;
  activeSuggestionIndex: number;
  clear: () => void;
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  open: boolean;
  query: string;
  selectSuggestion: (item: Item) => void;
  setOpen: (open: boolean) => void;
  setQuery: (query: string) => void;
  status: TypeaheadStatus;
  submit: () => Promise<void>;
  suggestions: readonly Item[];
}

const defaultNormalizeQuery = function normalizeQuery(query: string) {
  return query.trim().replace(/\s+/g, " ").toLocaleLowerCase();
};

const defaultCacheSize = 20;

export function useTypeahead<Item>(
  options: UseTypeaheadOptions<Item> & { getItemLabel: (item: Item) => string },
): UseTypeaheadResult<Item> {
  const {
    clearQueryOnSelect = false,
    getItemLabel,
    initialQuery = "",
    loadResults,
    loadSuggestions,
    maximumSuggestions = 6,
    minimumQueryLength = 1,
    minimumSuggestionLength = minimumQueryLength,
    normalizeQuery = defaultNormalizeQuery,
    onQueryChange,
    onResults,
    onSelect,
    query: controlledQuery,
    suggestionDelayMilliseconds = 250,
  } = options;
  const [uncontrolledQuery, setUncontrolledQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<readonly Item[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<TypeaheadStatus>("idle");
  const deferredQuery = useDeferredValue(controlledQuery ?? uncontrolledQuery);
  const requestNumber = useRef(0);
  const suggestionCache = useRef(new Map<string, readonly Item[]>());
  const resultCache = useRef(new Map<string, readonly Item[]>());
  const isControlled = controlledQuery !== undefined;
  const query = controlledQuery ?? uncontrolledQuery;

  useEffect(
    function loadTypeaheadSuggestions() {
      const normalizedQuery = normalizeQuery(deferredQuery);
      if (normalizedQuery.length < minimumSuggestionLength) {
        const timeoutId = window.setTimeout(function clearShortQuery() {
          setSuggestions([]);
          setActiveSuggestionIndex(-1);
          setOpen(false);
          setStatus("idle");
        }, 0);
        return function cancelShortQueryReset() {
          window.clearTimeout(timeoutId);
        };
      }

      let cancelled = false;
      const currentRequest = ++requestNumber.current;
      const timeoutId = window.setTimeout(function requestSuggestions() {
        const cachedResults = readCache(suggestionCache.current, normalizedQuery);
        if (cachedResults) {
          showSuggestions(cachedResults);
          return;
        }
        setStatus("loading");
        loadSuggestions(normalizedQuery)
          .then(function receiveSuggestions(results) {
            if (cancelled || currentRequest !== requestNumber.current) return;
            const nextSuggestions = results.slice(0, maximumSuggestions);
            writeCache(suggestionCache.current, normalizedQuery, nextSuggestions);
            showSuggestions(nextSuggestions);
            return undefined;
          })
          .catch(function showSuggestionError() {
            if (cancelled || currentRequest !== requestNumber.current) return;
            setSuggestions([]);
            setActiveSuggestionIndex(-1);
            setOpen(false);
            setStatus("error");
          });
      }, suggestionDelayMilliseconds);

      return function cancelSuggestionRequest() {
        cancelled = true;
        window.clearTimeout(timeoutId);
      };

      function showSuggestions(nextSuggestions: readonly Item[]) {
        if (cancelled || currentRequest !== requestNumber.current) return;
        setSuggestions(nextSuggestions);
        setActiveSuggestionIndex(nextSuggestions.length > 0 ? 0 : -1);
        setOpen(nextSuggestions.length > 0);
        setStatus("idle");
      }
    },
    [
      deferredQuery,
      loadSuggestions,
      maximumSuggestions,
      minimumSuggestionLength,
      normalizeQuery,
      suggestionDelayMilliseconds,
    ],
  );

  function setQuery(nextQuery: string) {
    if (!isControlled) setUncontrolledQuery(nextQuery);
    onQueryChange?.(nextQuery);
    requestNumber.current += 1;
    setSuggestions([]);
    setActiveSuggestionIndex(-1);
    setOpen(false);
    if (normalizeQuery(nextQuery).length < minimumQueryLength) setStatus("idle");
  }

  function clear() {
    setQuery("");
  }

  function selectSuggestion(item: Item) {
    setQuery(clearQueryOnSelect ? "" : getItemLabel(item));
    setOpen(false);
    setActiveSuggestionIndex(-1);
    onSelect?.(item);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveSuggestionIndex(-1);
      return;
    }
    if (!open || suggestions.length === 0) {
      if (event.key === "ArrowDown" && suggestions.length > 0) setOpen(true);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveSuggestionIndex(function moveActiveSuggestion(index) {
        return (index + direction + suggestions.length) % suggestions.length;
      });
    } else if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeSuggestionIndex]!);
    }
  }

  async function submit() {
    const submittedQuery = normalizeQuery(query);
    if (submittedQuery.length < minimumQueryLength) return;
    const cachedResults = readCache(resultCache.current, submittedQuery);
    if (cachedResults) {
      setOpen(false);
      setStatus("idle");
      onResults?.(cachedResults, submittedQuery);
      return;
    }

    const currentRequest = ++requestNumber.current;
    setStatus("loading");
    try {
      const results = await (loadResults ?? loadSuggestions)(submittedQuery);
      if (currentRequest !== requestNumber.current) return;
      writeCache(resultCache.current, submittedQuery, results);
      setOpen(false);
      setStatus("idle");
      onResults?.(results, submittedQuery);
    } catch {
      if (currentRequest === requestNumber.current) setStatus("error");
    }
  }

  return {
    activateSuggestion: setActiveSuggestionIndex,
    activeSuggestionIndex,
    clear,
    handleKeyDown,
    open,
    query,
    selectSuggestion,
    setOpen,
    setQuery,
    status,
    submit,
    suggestions,
  };
}

function readCache<Item>(cache: Map<string, readonly Item[]>, query: string) {
  const results = cache.get(query);
  if (!results) return undefined;
  cache.delete(query);
  cache.set(query, results);
  return results;
}

function writeCache<Item>(
  cache: Map<string, readonly Item[]>,
  query: string,
  results: readonly Item[],
) {
  cache.delete(query);
  cache.set(query, results);
  if (cache.size <= defaultCacheSize) return;
  const oldestQuery = cache.keys().next().value;
  if (oldestQuery !== undefined) cache.delete(oldestQuery);
}
