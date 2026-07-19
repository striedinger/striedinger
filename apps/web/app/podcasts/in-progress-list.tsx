"use client";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import Image from "next/image";

import type { PodcastProgress, PodcastMessages } from "./types";

interface InProgressListProps {
  items: PodcastProgress[];
  messages: PodcastMessages;
  onRemove: (episodeId: string) => void;
  onResume: (item: PodcastProgress) => void;
}

export function InProgressList({ items, messages, onRemove, onResume }: InProgressListProps) {
  if (items.length === 0) {
    return (
      <Surface className="flex min-h-48 items-center justify-center p-8 text-center">
        <Text tone="muted">
          {messages["Episodes you start will appear here so you can pick up where you left off."]}
        </Text>
      </Surface>
    );
  }

  return (
    <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
      {items.map(function renderProgressItem(item) {
        const progressPercentage =
          item.durationSeconds > 0
            ? Math.min(100, Math.round((item.positionSeconds / item.durationSeconds) * 100))
            : 0;
        return (
          <Surface as="li" key={item.episode.id} className="flex min-w-0 gap-4 p-4">
            <Image
              src={item.podcast.artworkUrl}
              alt=""
              width={80}
              height={80}
              sizes="80px"
              className="size-20 shrink-0 rounded-xl object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <Text size="xs" tone="muted" numberOfLines={1}>
                {item.podcast.title}
              </Text>
              <Text as="h3" size="sm" weight="semibold" numberOfLines={2} className="mt-0.5">
                {item.episode.title}
              </Text>
              <div
                role="progressbar"
                aria-label={`${item.episode.title}: ${progressPercentage}%`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercentage}
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={function resumeEpisode() {
                    onResume(item);
                  }}
                >
                  <span aria-hidden="true">▶</span> {messages["Resume"]}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        aria-label={`${messages["Remove from in progress"]}: ${item.episode.title}`}
                        className="text-muted-foreground hover:text-destructive"
                      />
                    }
                  >
                    {messages["Remove"]}
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <div className="flex flex-col gap-6">
                      <div className="flex flex-col gap-2">
                        <AlertDialogTitle render={<Text as="h2" size="2xl" weight="semibold" />}>
                          {messages["Remove saved progress?"]}
                        </AlertDialogTitle>
                        <AlertDialogDescription
                          render={<Text tone="muted" className="leading-relaxed" />}
                        >
                          {
                            messages[
                              "Your saved listening position for this episode will be deleted."
                            ]
                          }{" "}
                          “{item.episode.title}”
                        </AlertDialogDescription>
                      </div>
                      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <AlertDialogClose render={<Button type="button" variant="outline" />}>
                          {messages["Cancel"]}
                        </AlertDialogClose>
                        <AlertDialogClose
                          render={
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={function removeProgress() {
                                onRemove(item.episode.id);
                              }}
                            />
                          }
                        >
                          {messages["Remove"]}
                        </AlertDialogClose>
                      </div>
                    </div>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </Surface>
        );
      })}
    </ul>
  );
}
