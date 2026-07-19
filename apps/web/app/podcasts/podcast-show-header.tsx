"use client";

import { Button } from "@workspace/ui/components/button";
import { Text } from "@workspace/ui/components/text";
import Image from "next/image";

import type { Podcast, PodcastMessages } from "./types";

interface PodcastShowHeaderProps {
  messages: PodcastMessages;
  locale: string;
  onBack: () => void;
  onToggleSaved: () => void;
  podcast: Podcast;
  saved: boolean;
}

export function PodcastShowHeader({
  messages,
  locale,
  onBack,
  onToggleSaved,
  podcast,
  saved,
}: PodcastShowHeaderProps) {
  const latestRelease = podcast.latestReleaseAt
    ? new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(podcast.latestReleaseAt))
    : null;

  return (
    <header className="mb-6 border-b border-border/70 pb-6">
      <Button type="button" variant="ghost" size="xs" className="mb-4 -ml-2" onClick={onBack}>
        <span aria-hidden="true">←</span> {messages["Back to shows"]}
      </Button>

      <div className="grid gap-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-start">
        <div className="relative aspect-square w-32 overflow-hidden rounded-2xl bg-muted shadow-sm sm:w-36">
          <Image
            src={podcast.artworkUrl}
            alt={`${podcast.title} — ${messages["Cover art"]}`}
            fill
            sizes="144px"
            priority
            className="object-cover"
          />
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {podcast.genre ? (
              <Text
                as="span"
                size="xs"
                weight="medium"
                className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground"
              >
                {podcast.genre}
              </Text>
            ) : null}
            {podcast.explicit ? (
              <Text
                as="span"
                size="xs"
                weight="bold"
                className="rounded-sm border border-border px-1.5 py-0.5"
              >
                {messages["Explicit"]}
              </Text>
            ) : null}
          </div>
          <Text as="h2" id="episode-heading" size="3xl" weight="semibold">
            {podcast.title}
          </Text>
          <Text size="base" tone="muted" className="mt-1">
            {podcast.author}
          </Text>

          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {podcast.episodeCount !== undefined ? (
              <div>
                <dt className="sr-only">{messages["episodes"]}</dt>
                <dd className="font-medium tabular-nums">
                  {podcast.episodeCount.toLocaleString(locale)} {messages["episodes"]}
                </dd>
              </div>
            ) : null}
            {latestRelease ? (
              <div className="flex gap-1.5">
                <dt className="text-muted-foreground">{messages["Last updated"]}</dt>
                <dd className="font-medium tabular-nums">{latestRelease}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={saved ? "secondary" : "default"}
              onClick={onToggleSaved}
            >
              {saved ? messages["Added"] : messages["Add"]}
            </Button>
            <a
              href={podcast.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-8 items-center rounded-md px-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {messages["View on Apple Podcasts"]} <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
