"use client";

import { useEffect, useState } from "react";

interface PlaybackProgressProps {
  durationMs: number;
  /** How far into the song playback was when the server rendered this reading. */
  elapsedMs: number;
  isPlaying: boolean;
  labels: { playbackPosition: string; progressValue: string };
}

/**
 * The scrubber under a song. Between refreshes it counts seconds from the server's reading,
 * never from the viewer's clock, so a phone set to the wrong time still shows the right spot.
 * Give it a `key` per reading: a new reading remounts it, so the bar jumps to a new song's
 * start instead of sliding back.
 */
export function PlaybackProgress({
  durationMs,
  elapsedMs: initialElapsedMs,
  isPlaying,
  labels,
}: PlaybackProgressProps) {
  const [secondsSinceReading, setSecondsSinceReading] = useState(0);

  useEffect(
    function countSecondsWhilePlaying() {
      if (!isPlaying) return;
      const interval = window.setInterval(function countSecond() {
        setSecondsSinceReading(function addSecond(seconds) {
          return seconds + 1;
        });
      }, 1_000);
      return function stopCounting() {
        window.clearInterval(interval);
      };
    },
    [isPlaying],
  );

  const elapsedMs = Math.min(durationMs, initialElapsedMs + secondsSinceReading * 1_000);
  const fraction = durationMs > 0 ? elapsedMs / durationMs : 0;
  const elapsed = formatTrackTime(elapsedMs);
  const total = formatTrackTime(durationMs);

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="progressbar"
        aria-label={labels.playbackPosition}
        aria-valuemin={0}
        aria-valuemax={Math.round(durationMs / 1_000)}
        aria-valuenow={Math.round(elapsedMs / 1_000)}
        aria-valuetext={labels.progressValue
          .replace("{elapsed}", elapsed)
          .replace("{total}", total)}
        className="h-1.25 overflow-hidden rounded-full bg-ios-label/15"
      >
        <div
          className="h-full origin-left rounded-full bg-ios-label transition-transform duration-1000 ease-linear motion-reduce:transition-none"
          style={{ transform: `scaleX(${fraction})` }}
        />
      </div>
      <div
        aria-hidden="true"
        className="flex justify-between text-ios-caption2 font-medium text-ios-secondary-label tabular-nums"
      >
        <span>{elapsed}</span>
        <span>−{formatTrackTime(durationMs - elapsedMs)}</span>
      </div>
    </div>
  );
}

function formatTrackTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
