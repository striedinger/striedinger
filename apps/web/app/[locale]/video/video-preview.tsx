"use client";

import type { RefObject } from "react";

import { PauseFillIcon } from "@workspace/icons/pause-fill-icon";
import { PlayFillIcon } from "@workspace/icons/play-fill-icon";
import { cn } from "@workspace/ui/lib/utils";

import type { OpenedVideo } from "./open-video";
import type { PlayheadStore } from "./playhead-store";
import type { VideoCaption, VideoWatermark } from "./types";
import type { VideoPlayback } from "./video-playback";

import { iosGlassClassName } from "../../../components/ios/ios-glass";
import { VideoCaptionOverlay } from "./video-caption-overlay";
import { VideoWatermarkOverlay } from "./video-watermark-overlay";

interface VideoPreviewProps {
  aspectRatio: number;
  captions: readonly VideoCaption[];
  isPlaying: boolean;
  labels: { pause: string; play: string };
  onPlayingChange: (isPlaying: boolean) => void;
  onTogglePlayback: () => void;
  opened: OpenedVideo;
  playbackRef: RefObject<VideoPlayback | null>;
  playhead: PlayheadStore;
  /** Where the trimmed clip starts, which the watermark's movement is timed from. */
  trimStart: number;
  watermark: VideoWatermark | null;
}

/**
 * The video, decoded onto a canvas, with the caption and watermark over it. Overlays follow the
 * playhead themselves, so playback never re-renders the preview. Tapping the picture plays or
 * pauses.
 */
export function VideoPreview({
  aspectRatio,
  captions,
  isPlaying,
  labels,
  onPlayingChange,
  onTogglePlayback,
  opened,
  playbackRef,
  playhead,
  trimStart,
  watermark,
}: VideoPreviewProps) {
  return (
    <div
      className="relative mx-auto flex max-h-[min(60dvh,36rem)] w-full items-center justify-center overflow-hidden rounded-ios-2xl bg-black"
      // A size container, so overlays can be sized relative to the frame like the export's.
      style={{ aspectRatio, containerType: "size" }}
    >
      <canvas
        ref={function attachPlayback(canvas: HTMLCanvasElement | null) {
          if (!canvas) return;
          const playback = opened.createPlayback(canvas, function reportPaused(paused) {
            onPlayingChange(!paused);
          });
          playbackRef.current = playback;
          return function releasePlayback() {
            playbackRef.current = null;
            playback.dispose();
          };
        }}
        aria-hidden="true"
        className="absolute inset-0 size-full object-contain"
        onClick={onTogglePlayback}
      />
      {watermark ? (
        <VideoWatermarkOverlay playhead={playhead} trimStart={trimStart} watermark={watermark} />
      ) : null}
      <VideoCaptionOverlay captions={captions} playhead={playhead} />
      <button
        type="button"
        aria-label={isPlaying ? labels.pause : labels.play}
        className={cn(
          "absolute flex size-16 items-center justify-center rounded-full text-white transition-opacity duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:transition-none [&_svg]:size-7",
          iosGlassClassName,
          isPlaying ? "pointer-events-none opacity-0 focus-visible:opacity-100" : "opacity-100",
        )}
        onClick={onTogglePlayback}
      >
        {isPlaying ? <PauseFillIcon /> : <PlayFillIcon className="translate-x-0.5" />}
      </button>
    </div>
  );
}
