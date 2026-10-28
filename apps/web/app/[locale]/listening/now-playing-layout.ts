import { cn } from "@workspace/ui/lib/utils";

import { iosGlassClassName } from "../../../components/ios/ios-glass";

// The card and its loading placeholder share this geometry, so the placeholder occupies the
// same place at every size, from X's 343 × 193 card up to a full window.

export const nowPlayingFrameClassName =
  "relative isolate flex size-full items-center justify-center overflow-hidden p-[clamp(0.875rem,4.2vw,2.5rem)]";

/** The Lock Screen media platter: one sheet of glass over the artwork's own colors. */
export const nowPlayingPlatterClassName = cn(
  iosGlassClassName,
  "flex w-full max-w-3xl items-center gap-[clamp(0.75rem,3.4vw,2rem)] rounded-(--platter-radius) p-(--platter-padding) [--platter-padding:clamp(0.625rem,2.6vw,1.5rem)] [--platter-radius:clamp(1.375rem,5.6vw,2.75rem)]",
);

/**
 * The cover, whose corners stay concentric to the platter's. It is sized to stand taller than
 * the details beside it in every state, so the platter is as tall as the cover whether a song
 * is playing, paused, idle, or still loading, and nothing shifts when the reading arrives.
 */
export const nowPlayingArtworkClassName =
  "relative aspect-square size-[clamp(6rem,min(calc(6.125rem+9vw),calc(100dvh-3.25rem)),16rem)] shrink-0 overflow-hidden rounded-[calc(var(--platter-radius)-var(--platter-padding))]";

export const nowPlayingDetailsClassName =
  "flex min-w-0 flex-1 flex-col justify-center gap-[clamp(0.375rem,1.8vw,1rem)]";

export const nowPlayingTitleClassName =
  "text-[clamp(1rem,4.2vw,2.25rem)] leading-tight tracking-[-0.02em]";

export const nowPlayingSubtitleClassName = "text-[clamp(0.8125rem,3.4vw,1.5rem)] leading-snug";
