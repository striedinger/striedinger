"use client";

import { Text } from "@workspace/ui/components/text";
import { use, useState } from "react";

import type { PodcastMessages, PodcastShow } from "./types";

interface PodcastShowDescriptionProps {
  messages: PodcastMessages;
  show: Promise<PodcastShow | null>;
}

/** The latest episode's summary, collapsed to three lines like the Podcasts show header. */
export function PodcastShowDescription({ messages, show }: PodcastShowDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const description = use(show)?.episodes[0]?.description ?? "";
  if (!description) return null;

  return (
    <button
      type="button"
      aria-expanded={isExpanded}
      className="max-w-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      onClick={function toggleDescription() {
        setIsExpanded(!isExpanded);
      }}
    >
      <Text
        as="span"
        numberOfLines={isExpanded ? undefined : 3}
        className="text-[15px] leading-5 tracking-[-0.23px] text-white/80"
      >
        {description}
      </Text>
      {isExpanded ? null : (
        <Text as="span" className="text-[13px] font-semibold text-white uppercase">
          {messages["Show More"]}
        </Text>
      )}
    </button>
  );
}
