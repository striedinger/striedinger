"use client";

import type { KeyboardEvent, PointerEvent } from "react";

import { ChevronLeftIcon } from "@workspace/icons/chevron-left-icon";
import { ChevronRightIcon } from "@workspace/icons/chevron-right-icon";
import { PauseFillIcon } from "@workspace/icons/pause-fill-icon";
import { PlayFillIcon } from "@workspace/icons/play-fill-icon";
import { cn } from "@workspace/ui/lib/utils";
import { useRef } from "react";

import type { VideoTrim } from "./types";

import { iosGlassClassName } from "../../../components/ios/ios-glass";
import { formatClock } from "./captions";

interface VideoTrimBarProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  labels: { pause: string; play: string; playhead: string; trimEnd: string; trimStart: string };
  onSeek: (time: number) => void;
  onTogglePlayback: () => void;
  onTrimChange: (trim: VideoTrim) => void;
  thumbnails: readonly { time: number; url: string }[];
  trim: VideoTrim;
}

type DragTarget = "start" | "end" | "playhead";

/** The shortest clip the handles allow, so they never cross. */
const minimumClipSeconds = 0.2;

/**
 * The Photos trim bar: a filmstrip framed by yellow handles that set the clip, with a
 * playhead that scrubs. Dragging a handle shows that frame in the preview.
 */
export function VideoTrimBar({
  currentTime,
  duration,
  isPlaying,
  labels,
  onSeek,
  onTogglePlayback,
  onTrimChange,
  thumbnails,
  trim,
}: VideoTrimBarProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragTarget | null>(null);
  const safeDuration = duration || 1;
  const startPercent = (trim.start / safeDuration) * 100;
  const endPercent = (trim.end / safeDuration) * 100;
  const playheadPercent =
    (Math.min(Math.max(currentTime, trim.start), trim.end) / safeDuration) * 100;

  function readTime(clientX: number) {
    const rect = stripRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * duration;
  }

  function moveTarget(target: DragTarget, time: number) {
    if (target === "start") {
      const start = Math.min(time, trim.end - minimumClipSeconds);
      onTrimChange({ end: trim.end, start: Math.max(0, start) });
      onSeek(Math.max(0, start));
    } else if (target === "end") {
      const end = Math.max(time, trim.start + minimumClipSeconds);
      onTrimChange({ end: Math.min(duration, end), start: trim.start });
      onSeek(Math.min(duration, end));
    } else {
      onSeek(Math.min(trim.end, Math.max(trim.start, time)));
    }
  }

  function startDrag(target: DragTarget, event: PointerEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = target;
    if (target === "playhead") moveTarget(target, readTime(event.clientX));
  }

  function drag(event: PointerEvent<HTMLElement>) {
    if (dragRef.current) moveTarget(dragRef.current, readTime(event.clientX));
  }

  function endDrag() {
    dragRef.current = null;
  }

  function nudge(target: DragTarget, event: KeyboardEvent<HTMLElement>) {
    const step = event.shiftKey ? 1 : 0.1;
    const value = target === "start" ? trim.start : target === "end" ? trim.end : currentTime;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") moveTarget(target, value - step);
    else if (event.key === "ArrowRight" || event.key === "ArrowUp")
      moveTarget(target, value + step);
    else return;
    event.preventDefault();
  }

  const handleClassName =
    "absolute inset-y-0 z-10 flex w-4 cursor-ew-resize touch-none items-center justify-center bg-ios-yellow text-black/70 outline-none focus-visible:ring-2 focus-visible:ring-ios-tint [&_svg]:size-3.5";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label={isPlaying ? labels.pause : labels.play}
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full text-ios-label outline-none focus-visible:ring-2 focus-visible:ring-ios-tint/60 active:scale-[0.92] [&_svg]:size-4.5",
          iosGlassClassName,
        )}
        onClick={onTogglePlayback}
      >
        {isPlaying ? <PauseFillIcon /> : <PlayFillIcon className="translate-x-px" />}
      </button>
      <div
        ref={stripRef}
        className="relative mx-4 h-12 min-w-0 flex-1 touch-none select-none"
        onPointerDown={function scrub(event) {
          startDrag("playhead", event);
        }}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="flex size-full overflow-hidden rounded-ios-sm bg-ios-fill">
          {thumbnails.map(function renderThumbnail(thumbnail) {
            return (
              // Filmstrip frames are decorative blob data from the person's own video.
              // oxlint-disable-next-line nextjs/no-img-element
              <img
                key={thumbnail.time}
                src={thumbnail.url}
                alt=""
                className="h-full min-w-0 flex-1 object-cover"
                draggable={false}
              />
            );
          })}
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 rounded-l-ios-sm bg-black/55"
          style={{ width: `${startPercent}%` }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 rounded-r-ios-sm bg-black/55"
          style={{ width: `${100 - endPercent}%` }}
        />
        <div
          className="absolute inset-y-0 rounded-ios-sm border-y-[3px] border-ios-yellow"
          style={{ left: `${startPercent}%`, right: `${100 - endPercent}%` }}
        >
          <span
            role="slider"
            tabIndex={0}
            aria-label={labels.trimStart}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration * 10) / 10}
            aria-valuenow={Math.round(trim.start * 10) / 10}
            aria-valuetext={formatClock(trim.start)}
            className={cn(handleClassName, "-left-4 rounded-l-ios-sm")}
            onPointerDown={function dragStart(event) {
              startDrag("start", event);
            }}
            onPointerMove={drag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={function nudgeStart(event) {
              nudge("start", event);
            }}
          >
            <ChevronLeftIcon strokeWidth={3.2} />
          </span>
          <span
            role="slider"
            tabIndex={0}
            aria-label={labels.trimEnd}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration * 10) / 10}
            aria-valuenow={Math.round(trim.end * 10) / 10}
            aria-valuetext={formatClock(trim.end)}
            className={cn(handleClassName, "-right-4 rounded-r-ios-sm")}
            onPointerDown={function dragEnd(event) {
              startDrag("end", event);
            }}
            onPointerMove={drag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={function nudgeEnd(event) {
              nudge("end", event);
            }}
          >
            <ChevronRightIcon strokeWidth={3.2} />
          </span>
        </div>
        <span
          role="slider"
          tabIndex={0}
          aria-label={labels.playhead}
          aria-valuemin={Math.round(trim.start * 10) / 10}
          aria-valuemax={Math.round(trim.end * 10) / 10}
          aria-valuenow={Math.round(currentTime * 10) / 10}
          aria-valuetext={formatClock(currentTime)}
          className="absolute -inset-y-1 z-20 w-1 -translate-x-1/2 rounded-full bg-white shadow-ios-raised outline-none focus-visible:ring-2 focus-visible:ring-ios-tint"
          style={{ left: `${playheadPercent}%` }}
          onKeyDown={function nudgePlayhead(event) {
            nudge("playhead", event);
          }}
        />
      </div>
    </div>
  );
}
