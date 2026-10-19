"use client";

import { Text } from "@workspace/ui/components/text";

import type { PlayheadStore } from "./playhead-store";
import type { VideoCaption } from "./types";

import { findCaptionAt } from "./captions";
import { usePlayheadSelection } from "./playhead-store";

interface VideoCaptionOverlayProps {
  captions: readonly VideoCaption[];
  playhead: PlayheadStore;
}

/** The caption at the playhead, drawn the way iOS shows subtitles. */
export function VideoCaptionOverlay({ captions, playhead }: VideoCaptionOverlayProps) {
  // Re-renders when the text on screen changes, not on every frame of playback.
  const caption = usePlayheadSelection(playhead, function findShowingText(time) {
    return findCaptionAt(captions, time)?.text.trim() || null;
  });
  if (!caption) return null;
  return (
    <Text
      aria-live="polite"
      className="pointer-events-none absolute inset-x-[8%] bottom-[7%] mx-auto w-fit max-w-[84%] rounded-ios-xs bg-black/70 px-2.5 py-1 text-center text-ios-callout font-semibold whitespace-pre-line text-white"
    >
      {caption}
    </Text>
  );
}
