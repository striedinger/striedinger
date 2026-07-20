"use client";

import { DownloadIcon } from "@workspace/icons/download-icon";
import { Button } from "@workspace/ui/components/button";
import { Text } from "@workspace/ui/components/text";
import Link from "next/link";

import type { PodcastEpisode, PodcastMessages } from "./types";

import { getPodcastEpisodeHref } from "./podcast-links";

interface EpisodeListProps {
  activeEpisodeId: string | null;
  episodes: PodcastEpisode[];
  messages: PodcastMessages;
  locale: string;
  onPlay: (episode: PodcastEpisode) => void;
  podcastId: string;
}

export function EpisodeList({
  activeEpisodeId,
  episodes,
  messages,
  locale,
  onPlay,
  podcastId,
}: EpisodeListProps) {
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-border/70 p-0">
      {episodes.map(function renderEpisode(episode) {
        const isActive = episode.id === activeEpisodeId;
        return (
          <li
            key={episode.id}
            className="grid gap-3 py-5 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <div className="min-w-0">
              <h3>
                <Text
                  as={Link}
                  href={getPodcastEpisodeHref(podcastId, episode.id)}
                  scroll={false}
                  size="base"
                  weight="semibold"
                  numberOfLines={2}
                  aria-current={isActive ? "page" : undefined}
                  className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {episode.title}
                </Text>
              </h3>
              <Text size="xs" tone="muted" className="mt-1 tabular-nums">
                {dateFormatter.format(new Date(episode.publishedAt))}
                {episode.durationMilliseconds > 0
                  ? ` · ${formatDuration(episode.durationMilliseconds, messages)}`
                  : ""}
              </Text>
              {episode.description ? (
                <Text size="sm" tone="muted" numberOfLines={2} className="mt-2">
                  {episode.description}
                </Text>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={isActive ? "secondary" : "outline"}
                aria-pressed={isActive}
                onClick={function playEpisode() {
                  onPlay(episode);
                }}
              >
                <span aria-hidden="true">{isActive ? "◼" : "▶"}</span>
                {isActive ? messages["Pause"] : messages["Play"]}
              </Button>
              <a
                href={episode.audioUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${messages["Download episode"]}: ${episode.title}`}
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring motion-reduce:transition-none"
              >
                <DownloadIcon className="size-4" />
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function formatDuration(milliseconds: number, messages: PodcastMessages) {
  const totalMinutes = Math.round(milliseconds / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0
    ? `${hours}${messages["h"]} ${minutes}${messages["m"]}`
    : `${minutes}${messages["m"]}`;
}
