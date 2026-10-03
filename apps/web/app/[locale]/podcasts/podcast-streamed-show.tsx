"use client";

import { use } from "react";

import type { PodcastShow } from "./types";

import { PodcastShowPage } from "./podcast-show-page";
import { PodcastStackPlaceholder } from "./podcast-stack-placeholder";
import { usePodcasts } from "./podcasts-context";

interface PodcastStreamedShowProps {
  show: Promise<PodcastShow | null>;
}

/** A show the app had not seen in any list, rendered once its details arrive. */
export function PodcastStreamedShow({ show }: PodcastStreamedShowProps) {
  const { messages } = usePodcasts();
  const resolvedShow = use(show);
  if (!resolvedShow) {
    return (
      <PodcastStackPlaceholder
        message={messages["Episodes are unavailable right now. Please try another show."]}
      />
    );
  }
  return <PodcastShowPage podcast={resolvedShow.podcast} show={show} />;
}
