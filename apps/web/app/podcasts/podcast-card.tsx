"use client";

import { CheckIcon } from "@workspace/icons/check-icon";
import { Button } from "@workspace/ui/components/button";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import Image from "next/image";
import Link from "next/link";

import type { Podcast, PodcastMessages } from "./types";

import { getPodcastHref } from "./podcast-links";

interface PodcastCardProps {
  eagerArtwork?: boolean;
  messages: PodcastMessages;
  onToggleSaved: (podcast: Podcast) => void;
  podcast: Podcast;
  saved: boolean;
  selected: boolean;
}

export function PodcastCard({
  eagerArtwork = false,
  messages,
  onToggleSaved,
  podcast,
  saved,
  selected,
}: PodcastCardProps) {
  return (
    <Surface
      as="article"
      className="flex h-full min-w-0 flex-col overflow-hidden aria-[current=true]:border-primary/50 aria-[current=true]:ring-2 aria-[current=true]:ring-primary/15"
      aria-current={selected ? "true" : undefined}
    >
      <Link
        href={getPodcastHref(podcast.id)}
        className="group flex min-w-0 flex-1 flex-col text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-inset"
      >
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          <Image
            src={podcast.artworkUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 44vw"
            quality={60}
            loading={eagerArtwork ? "eager" : "lazy"}
            fetchPriority={eagerArtwork ? "high" : "auto"}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transition-none"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
          <Text as="h3" size="base" weight="semibold" numberOfLines={2}>
            {podcast.title}
          </Text>
          <Text size="sm" tone="muted" numberOfLines={1}>
            {podcast.author}
          </Text>
          {podcast.genre ? (
            <Text size="xs" tone="muted" className="mt-auto pt-3">
              {podcast.genre}
            </Text>
          ) : null}
        </div>
      </Link>

      <div className="border-t border-border/70 p-2">
        <Button
          type="button"
          size="sm"
          variant={saved ? "secondary" : "default"}
          className="min-w-0 flex-1"
          onClick={function toggleSaved() {
            onToggleSaved(podcast);
          }}
        >
          {saved ? <CheckIcon /> : <span aria-hidden="true">＋</span>}
          {saved ? messages["Remove"] : messages["Add"]}
          <span className="sr-only">: {podcast.title}</span>
        </Button>
      </div>
    </Surface>
  );
}
