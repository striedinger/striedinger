"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import Image from "next/image";
import Link from "next/link";
import { type FormEvent, type MouseEvent } from "react";

import type { Podcast, PodcastMessages } from "./types";

import { useTypeahead } from "../../components/use-typeahead";
import { searchPodcasts } from "./actions";
import { getPodcastHref } from "./podcast-links";

interface PodcastSearchProps {
  initialQuery: string;
  messages: PodcastMessages;
  onOpenPodcast: (podcast: Podcast) => void;
  onShowResults: (podcasts: Podcast[], query: string) => void;
}

function keepInputFocus(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
}

function getPodcastTitle(podcast: Podcast) {
  return podcast.title;
}

export function PodcastSearch({
  initialQuery,
  messages,
  onOpenPodcast,
  onShowResults,
}: PodcastSearchProps) {
  const typeahead = useTypeahead({
    getItemLabel: getPodcastTitle,
    initialQuery,
    loadResults: searchPodcasts,
    loadSuggestions: searchPodcasts,
    maximumSuggestions: 6,
    minimumQueryLength: 2,
    onResults: function showResultPage(results, query) {
      onShowResults([...results], query);
    },
    onSelect: onOpenPodcast,
    suggestionDelayMilliseconds: 300,
  });
  const {
    activeSuggestionIndex,
    handleKeyDown,
    open,
    query,
    selectSuggestion,
    setOpen,
    setQuery,
    status,
    submit,
    suggestions,
  } = typeahead;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  return (
    <Surface className="relative z-20 p-3 sm:p-4">
      <form className="flex flex-col gap-2 sm:flex-row" role="search" onSubmit={handleSubmit}>
        <label htmlFor="podcast-search" className="sr-only">
          {messages["Search"]}
        </label>
        <div className="relative min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="size-4"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
          </span>
          <Input
            id="podcast-search"
            type="search"
            role="combobox"
            tabIndex={0}
            aria-autocomplete="list"
            aria-controls="podcast-suggestions"
            aria-expanded={open}
            aria-activedescendant={
              open && activeSuggestionIndex >= 0
                ? `podcast-suggestion-${activeSuggestionIndex}`
                : undefined
            }
            value={query}
            minLength={2}
            maxLength={80}
            autoComplete="off"
            enterKeyHint="search"
            placeholder={messages["Search shows, people, or topics"]}
            className="h-11 rounded-xl pr-9 pl-9"
            onChange={function updateQuery(event) {
              setQuery(event.currentTarget.value);
            }}
            onFocus={function reopenSuggestions() {
              if (suggestions.length > 0) setOpen(true);
            }}
            onBlur={function closeSuggestions() {
              setOpen(false);
            }}
            onKeyDown={handleKeyDown}
          />
          {status === "loading" ? (
            <span
              className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-muted-foreground border-r-transparent motion-reduce:animate-none"
              aria-hidden="true"
            />
          ) : null}
          {open ? (
            <Surface
              id="podcast-suggestions"
              role="listbox"
              aria-label={messages["Search results"]}
              className="absolute top-[calc(100%+0.5rem)] right-0 left-0 max-h-96 overflow-y-auto p-1 shadow-raised"
            >
              {suggestions.map(function renderSuggestion(podcast, index) {
                return (
                  <Link
                    key={podcast.id}
                    id={`podcast-suggestion-${index}`}
                    href={getPodcastHref(podcast.id)}
                    role="option"
                    aria-selected={index === activeSuggestionIndex}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none aria-selected:bg-accent motion-reduce:transition-none"
                    aria-label={`${messages["Show episodes"]}: ${podcast.title}`}
                    onMouseDown={keepInputFocus}
                    onClick={function openSuggestion(event) {
                      if (
                        event.button !== 0 ||
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey
                      ) {
                        return;
                      }
                      event.preventDefault();
                      selectSuggestion(podcast);
                    }}
                  >
                    <Image
                      src={podcast.artworkUrl}
                      alt=""
                      width={48}
                      height={48}
                      sizes="48px"
                      className="size-12 rounded-lg object-cover"
                    />
                    <span className="min-w-0">
                      <Text as="span" size="sm" weight="semibold" numberOfLines={1}>
                        {podcast.title}
                      </Text>
                      <Text as="span" size="xs" tone="muted" numberOfLines={1} className="block">
                        {podcast.author}
                      </Text>
                    </span>
                  </Link>
                );
              })}
            </Surface>
          ) : null}
        </div>
        <Button
          type="submit"
          size="lg"
          loading={status === "loading" && !open}
          loadingLabel={messages["Searching podcasts"]}
          disabled={query.trim().length < 2}
          className="sm:min-w-28"
        >
          {messages["Search"]}
        </Button>
      </form>
      <div className="sr-only" aria-live="polite">
        {status === "loading"
          ? messages["Searching podcasts"]
          : status === "error"
            ? messages["Search is unavailable right now. Please try again."]
            : open
              ? `${suggestions.length} ${messages["Search results"]}`
              : ""}
      </div>
      {status === "error" ? (
        <Text size="sm" tone="destructive" className="px-1 pt-3">
          {messages["Search is unavailable right now. Please try again."]}
        </Text>
      ) : null}
    </Surface>
  );
}
