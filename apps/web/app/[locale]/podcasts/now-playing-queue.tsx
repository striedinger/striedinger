"use client";

import { CloseIcon } from "@workspace/icons/close-icon";
import { Text } from "@workspace/ui/components/text";

import type { PodcastMessages, PodcastQueueItem } from "./types";

import { PodcastArtwork } from "./podcast-artwork";
import { playEpisode, removeFromQueue } from "./podcast-player-store";

interface NowPlayingQueueProps {
  messages: PodcastMessages;
  queue: readonly PodcastQueueItem[];
}

export function NowPlayingQueue({ messages, queue }: NowPlayingQueueProps) {
  return (
    <section aria-label={messages["Up Next"]} className="flex min-h-0 flex-1 flex-col gap-2">
      <Text as="h3" className="text-ios-body font-semibold text-white">
        {messages["Up Next"]}
      </Text>
      {queue.length === 0 ? (
        <Text className="text-ios-subheadline text-white/60">
          {messages["Nothing is queued. Use Play Next or Play Last on any episode."]}
        </Text>
      ) : (
        <ul className="m-0 -mx-2 flex min-h-0 list-none flex-col overflow-y-auto overscroll-contain p-0">
          {queue.map(function renderQueuedEpisode(item) {
            return (
              <li key={item.episode.id} className="flex items-center gap-1">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-ios-md p-2 text-left outline-none focus-visible:bg-white/10 active:bg-white/10"
                  onClick={function playQueuedEpisode() {
                    playEpisode(item);
                  }}
                >
                  <PodcastArtwork
                    src={item.podcast.artworkUrl}
                    sizes="48px"
                    className="w-12 rounded-md"
                  />
                  <span className="flex min-w-0 flex-col">
                    <Text
                      as="span"
                      numberOfLines={1}
                      className="text-ios-subheadline font-medium text-white"
                    >
                      {item.episode.title}
                    </Text>
                    <Text as="span" numberOfLines={1} className="text-ios-footnote text-white/60">
                      {item.podcast.title}
                    </Text>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`${messages["Remove from Up Next"]}: ${item.episode.title}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-full text-white/60 outline-none focus-visible:bg-white/10 active:bg-white/10"
                  onClick={function removeQueuedEpisode() {
                    removeFromQueue(item.episode.id);
                  }}
                >
                  <CloseIcon className="size-4" strokeWidth={2.6} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
