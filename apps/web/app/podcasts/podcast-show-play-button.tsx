"use client";

import { PlayFillIcon } from "@workspace/icons/play-fill-icon";
import { use } from "react";

import type { Podcast, PodcastMessages, PodcastShow } from "./types";

import { usePodcastLibrary } from "./podcast-library-store";
import { playEpisode } from "./podcast-player-store";

interface PodcastShowPlayButtonProps {
  messages: PodcastMessages;
  podcast: Podcast;
  /** The streamed show, or null while it has not been requested yet. */
  show: Promise<PodcastShow | null> | null;
}

/** Resumes the show's last listened episode, or plays its latest one once episodes arrive. */
export function PodcastShowPlayButton({ messages, podcast, show }: PodcastShowPlayButtonProps) {
  const library = usePodcastLibrary();
  const latestEpisode = show ? use(show)?.episodes[0] : undefined;
  const resumeItem = library.progress.find(function belongsToShow(item) {
    return item.podcast.id === podcast.id;
  });

  return (
    <button
      type="button"
      disabled={!latestEpisode && !resumeItem}
      className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[12px] bg-white text-[17px] font-semibold text-black outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:opacity-70 disabled:opacity-50"
      onClick={function playShow() {
        if (resumeItem) playEpisode({ podcast: resumeItem.podcast, episode: resumeItem.episode });
        else if (latestEpisode) playEpisode({ podcast, episode: latestEpisode });
      }}
    >
      <PlayFillIcon className="size-4" />
      {resumeItem ? messages.Resume : messages["Latest Episode"]}
    </button>
  );
}
