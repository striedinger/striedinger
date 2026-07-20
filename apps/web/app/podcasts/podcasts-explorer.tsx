"use client";

import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import type { Podcast, PodcastEpisode, PodcastProgress, PodcastMessages } from "./types";

import { EpisodeList } from "./episode-list";
import { InProgressList } from "./in-progress-list";
import { PodcastCard } from "./podcast-card";
import { getPodcastEpisodeHref, getPodcastHref, getPodcastSearchHref } from "./podcast-links";
import { PodcastPlayer } from "./podcast-player";
import {
  readPodcastProgress,
  removePodcastProgress,
  savePodcastProgress,
} from "./podcast-progress";
import { PodcastSearch } from "./podcast-search";
import { PodcastShowHeader } from "./podcast-show-header";

interface PodcastsExplorerProps {
  initialEpisodeId: string;
  initialEpisodes: PodcastEpisode[];
  initialPodcasts: Podcast[];
  initialQuery: string;
  initialSelectedPodcast: Podcast | null;
  messages: PodcastMessages;
  locale: string;
}

type View = "explore" | "library" | "progress";

interface LocalViewState {
  hideServerSelection: boolean;
  routeKey: string;
  view: View;
}

interface PlaybackOverride {
  episode: PodcastEpisode | null;
  routeKey: string;
}

interface PendingPodcastRoute {
  episode: PodcastEpisode;
  podcast: Podcast;
}

interface StoredLibrary {
  podcasts: Podcast[];
  version: 2;
}

const storageKey = "podcast-library:v1";

export function PodcastsExplorer({
  initialEpisodeId,
  initialEpisodes,
  initialPodcasts,
  initialQuery,
  initialSelectedPodcast,
  messages,
  locale,
}: PodcastsExplorerProps) {
  const router = useRouter();
  const [savedPodcasts, setSavedPodcasts] = useState<Podcast[]>([]);
  const [localViewState, setLocalViewState] = useState<LocalViewState | null>(null);
  const [playbackOverride, setPlaybackOverride] = useState<PlaybackOverride | null>(null);
  const [pendingPodcastRoute, setPendingPodcastRoute] = useState<PendingPodcastRoute | null>(null);
  const [autoPlayEpisodeId, setAutoPlayEpisodeId] = useState<string | null>(null);
  const [resumePositionSeconds, setResumePositionSeconds] = useState(0);
  const [progressItems, setProgressItems] = useState<PodcastProgress[]>([]);
  const [isNavigating, startNavigation] = useTransition();
  const routeKey = `${initialQuery}:${initialSelectedPodcast?.id ?? ""}:${initialEpisodeId}`;
  const localViewApplies = localViewState?.routeKey === routeKey;
  const view = localViewApplies ? localViewState.view : "explore";
  const initialActiveEpisode =
    initialEpisodes.find(function matchesEpisode(episode) {
      return episode.id === initialEpisodeId;
    }) ?? null;
  const selectedPodcast =
    isNavigating && pendingPodcastRoute
      ? pendingPodcastRoute.podcast
      : view === "explore" && !(localViewApplies && localViewState.hideServerSelection)
        ? initialSelectedPodcast
        : null;
  const activeEpisode =
    isNavigating && pendingPodcastRoute
      ? pendingPodcastRoute.episode
      : playbackOverride?.routeKey === routeKey
        ? playbackOverride.episode
        : initialActiveEpisode;
  const shouldAutoPlay = activeEpisode?.id === autoPlayEpisodeId;

  useEffect(
    function restoreLibrary() {
      let cancelled = false;
      queueMicrotask(function readStoredLibrary() {
        if (cancelled) return;
        try {
          const value = window.localStorage.getItem(storageKey);
          if (value) {
            const stored = JSON.parse(value) as unknown;
            const storedPodcasts = readStoredPodcasts(stored);
            if (!storedPodcasts) throw new Error("Invalid library");
            const restoredPodcasts = storedPodcasts.slice(0, 100);
            setSavedPodcasts(restoredPodcasts);
            window.localStorage.setItem(
              storageKey,
              JSON.stringify({ version: 2, podcasts: restoredPodcasts } satisfies StoredLibrary),
            );
          }
        } catch {
          window.localStorage.removeItem(storageKey);
        }
        const storedProgress = readPodcastProgress();
        setProgressItems(storedProgress);
        const activeProgress = storedProgress.find(function matchesActiveEpisode(item) {
          return item.episode.id === initialEpisodeId;
        });
        setResumePositionSeconds(activeProgress?.positionSeconds ?? 0);
      });
      return function cancelLibraryRestore() {
        cancelled = true;
      };
    },
    [initialEpisodeId],
  );

  function persistLibrary(podcasts: Podcast[]) {
    setSavedPodcasts(podcasts);
    const storedLibrary: StoredLibrary = { version: 2, podcasts };
    window.localStorage.setItem(storageKey, JSON.stringify(storedLibrary));
  }

  function toggleSaved(podcast: Podcast) {
    const isSaved = savedPodcasts.some(function matchesPodcast(item) {
      return item.id === podcast.id;
    });
    const nextPodcasts = isSaved
      ? savedPodcasts.filter(function keepOtherPodcast(item) {
          return item.id !== podcast.id;
        })
      : [podcast, ...savedPodcasts].slice(0, 100);
    persistLibrary(nextPodcasts);
  }

  function navigateToPodcasts(href: string) {
    setPendingPodcastRoute(null);
    startNavigation(function navigate() {
      router.push(href, { scroll: false });
    });
  }

  function updateListeningProgress(
    podcast: Podcast,
    episode: PodcastEpisode,
    positionSeconds: number,
    durationSeconds: number,
  ) {
    setProgressItems(savePodcastProgress(podcast, episode, positionSeconds, durationSeconds));
  }

  function finishEpisode(episodeId: string) {
    setProgressItems(removePodcastProgress(episodeId));
    setPlaybackOverride({ episode: null, routeKey });
    setAutoPlayEpisodeId(null);
    setResumePositionSeconds(0);
    if (selectedPodcast) {
      window.history.replaceState(null, "", getPodcastHref(selectedPodcast.id));
    }
  }

  function resumeEpisode(item: PodcastProgress) {
    setProgressItems(
      savePodcastProgress(item.podcast, item.episode, item.positionSeconds, item.durationSeconds),
    );
    setPendingPodcastRoute({ episode: item.episode, podcast: item.podcast });
    startNavigation(function navigateToEpisode() {
      router.push(getPodcastEpisodeHref(item.podcast.id, item.episode.id), { scroll: false });
    });
    setResumePositionSeconds(item.positionSeconds);
    setAutoPlayEpisodeId(item.episode.id);
  }

  const visiblePodcasts = view === "explore" ? initialPodcasts : savedPodcasts;

  return (
    <div className="flex flex-col gap-8" aria-busy={isNavigating}>
      <PodcastSearch
        initialQuery={initialQuery}
        messages={messages}
        searchResults={initialPodcasts}
      />

      <div
        className="flex gap-1 overflow-x-auto border-b border-border"
        role="tablist"
        aria-label={messages["Podcasts"]}
      >
        {(["explore", "progress", "library"] as const).map(function renderTab(tab) {
          const count =
            tab === "progress"
              ? progressItems.length
              : tab === "library"
                ? savedPodcasts.length
                : null;
          return (
            <button
              key={tab}
              id={`podcast-tab-${tab}`}
              type="button"
              role="tab"
              aria-controls="podcast-panel"
              aria-selected={view === tab}
              className="min-h-11 shrink-0 border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-selected:border-primary aria-selected:text-foreground motion-reduce:transition-none"
              onClick={function selectView() {
                window.history.pushState(null, "", "/podcasts");
                setLocalViewState({ hideServerSelection: true, routeKey, view: tab });
                setPlaybackOverride({ episode: null, routeKey });
                setAutoPlayEpisodeId(null);
                setResumePositionSeconds(0);
              }}
            >
              {tab === "explore"
                ? messages["Explore"]
                : tab === "progress"
                  ? messages["In progress"]
                  : messages["Your library"]}
              {count === null ? "" : ` (${count})`}
            </button>
          );
        })}
      </div>

      {selectedPodcast ? (
        <Surface
          as="section"
          className="overflow-hidden p-5 sm:p-7"
          aria-labelledby="episode-heading"
        >
          <PodcastShowHeader
            messages={messages}
            locale={locale}
            podcast={selectedPodcast}
            saved={savedPodcasts.some(function matchesPodcast(item) {
              return item.id === selectedPodcast.id;
            })}
            onBack={function closePodcast() {
              setLocalViewState({ hideServerSelection: true, routeKey, view: "explore" });
              navigateToPodcasts(initialQuery ? getPodcastSearchHref(initialQuery) : "/podcasts");
              setPlaybackOverride({ episode: null, routeKey });
              setAutoPlayEpisodeId(null);
              setResumePositionSeconds(0);
            }}
            onToggleSaved={function saveSelectedPodcast() {
              toggleSaved(selectedPodcast);
            }}
          />

          {initialEpisodes.length > 0 ? (
            <EpisodeList
              activeEpisodeId={activeEpisode?.id ?? null}
              episodes={initialEpisodes}
              messages={messages}
              locale={locale}
              podcastId={selectedPodcast.id}
              onPlay={function toggleEpisode(episode) {
                const isStopping = activeEpisode?.id === episode.id;
                window.history.pushState(
                  null,
                  "",
                  isStopping
                    ? getPodcastHref(selectedPodcast.id)
                    : getPodcastEpisodeHref(selectedPodcast.id, episode.id),
                );
                setPlaybackOverride({ episode: isStopping ? null : episode, routeKey });
                const savedProgress = progressItems.find(function matchesEpisode(item) {
                  return item.episode.id === episode.id;
                });
                setResumePositionSeconds(isStopping ? 0 : (savedProgress?.positionSeconds ?? 0));
                setAutoPlayEpisodeId(isStopping ? null : episode.id);
              }}
            />
          ) : (
            <Text tone="muted">
              {messages["Episodes are unavailable right now. Please try another show."]}
            </Text>
          )}
        </Surface>
      ) : view === "progress" ? (
        <section id="podcast-panel" role="tabpanel" aria-labelledby="podcast-tab-progress">
          <div className="mb-5 flex items-end justify-between gap-4">
            <Text as="h2" size="2xl" weight="semibold">
              {messages["In progress"]}
            </Text>
            <Text as="span" size="sm" tone="muted" className="tabular-nums">
              {progressItems.length}
            </Text>
          </div>
          <InProgressList
            items={progressItems}
            messages={messages}
            onRemove={function removeProgress(episodeId) {
              setProgressItems(removePodcastProgress(episodeId));
            }}
            onResume={resumeEpisode}
          />
        </section>
      ) : (
        <section id="podcast-panel" role="tabpanel" aria-labelledby={`podcast-tab-${view}`}>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <Text as="h2" id="podcast-list-heading" size="2xl" weight="semibold">
                {view === "explore"
                  ? initialQuery
                    ? messages["Search results"]
                    : messages["Popular right now"]
                  : messages["Your library"]}
              </Text>
              <Text size="sm" tone="muted" className="mt-1">
                {messages["Your library stays on this device."]}
              </Text>
            </div>
            <Text as="span" size="sm" tone="muted" className="tabular-nums">
              {visiblePodcasts.length}
            </Text>
          </div>
          {visiblePodcasts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {visiblePodcasts.map(function renderPodcast(podcast, index) {
                return (
                  <PodcastCard
                    key={podcast.id}
                    podcast={podcast}
                    eagerArtwork={index === 0}
                    messages={messages}
                    saved={savedPodcasts.some(function matchesPodcast(item) {
                      return item.id === podcast.id;
                    })}
                    selected={false}
                    onToggleSaved={toggleSaved}
                  />
                );
              })}
            </div>
          ) : (
            <Surface className="flex min-h-48 items-center justify-center p-8 text-center">
              <Text tone="muted">
                {view === "explore"
                  ? messages["No podcasts found. Try a show, host, or topic."]
                  : messages["Your library is empty. Add a show from Explore to get started."]}
              </Text>
            </Surface>
          )}
        </section>
      )}

      {activeEpisode && selectedPodcast ? (
        <PodcastPlayer
          key={activeEpisode.id}
          autoPlay={shouldAutoPlay}
          episode={activeEpisode}
          initialPositionSeconds={resumePositionSeconds}
          messages={messages}
          podcast={selectedPodcast}
          onProgressChange={updateListeningProgress}
          onFinished={finishEpisode}
          onClose={function closePlayer() {
            window.history.replaceState(null, "", getPodcastHref(selectedPodcast.id));
            setPlaybackOverride({ episode: null, routeKey });
            setAutoPlayEpisodeId(null);
            setResumePositionSeconds(0);
          }}
        />
      ) : null}
    </div>
  );
}

function readStoredPodcasts(value: unknown): Podcast[] | null {
  if (!value || typeof value !== "object") return null;
  const library = value as { podcasts?: unknown; version?: unknown };
  if (library.version !== 1 && library.version !== 2) return null;
  if (!Array.isArray(library.podcasts) || !library.podcasts.every(isPodcast)) return null;
  return library.podcasts;
}

function isPodcast(value: unknown): value is Podcast {
  if (!value || typeof value !== "object") return false;
  const podcast = value as Partial<Podcast>;
  return (
    typeof podcast.id === "string" &&
    typeof podcast.title === "string" &&
    typeof podcast.author === "string" &&
    typeof podcast.artworkUrl === "string" &&
    typeof podcast.url === "string" &&
    typeof podcast.genre === "string" &&
    (podcast.episodeCount === undefined ||
      (typeof podcast.episodeCount === "number" && Number.isSafeInteger(podcast.episodeCount))) &&
    (podcast.explicit === undefined || typeof podcast.explicit === "boolean") &&
    (podcast.latestReleaseAt === undefined || typeof podcast.latestReleaseAt === "string")
  );
}
