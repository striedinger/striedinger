"use client";

import type { KeyboardEvent } from "react";

import type { PlayheadStore } from "./playhead-store";
import type { VideoTrim } from "./types";

import { formatClock } from "./captions";
import { usePlayheadTime } from "./playhead-store";

interface VideoTrimPlayheadProps {
  duration: number;
  label: string;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  playhead: PlayheadStore;
  trim: VideoTrim;
}

/** The white playhead line; the only part of the trim bar that moves during playback. */
export function VideoTrimPlayhead({
  duration,
  label,
  onKeyDown,
  playhead,
  trim,
}: VideoTrimPlayheadProps) {
  const time = usePlayheadTime(playhead);
  const percent = (Math.min(Math.max(time, trim.start), trim.end) / (duration || 1)) * 100;
  return (
    <span
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={Math.round(trim.start * 10) / 10}
      aria-valuemax={Math.round(trim.end * 10) / 10}
      aria-valuenow={Math.round(time * 10) / 10}
      aria-valuetext={formatClock(time)}
      className="absolute -inset-y-1 z-20 w-1 -translate-x-1/2 rounded-full bg-white shadow-ios-raised outline-none focus-visible:ring-2 focus-visible:ring-ios-tint"
      style={{ left: `${percent}%` }}
      onKeyDown={onKeyDown}
    />
  );
}
