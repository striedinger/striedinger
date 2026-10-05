"use client";

import type { RefObject } from "react";

import { PauseFillIcon } from "@workspace/icons/pause-fill-icon";
import { PlayFillIcon } from "@workspace/icons/play-fill-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

import type { OpenedVideo } from "./open-video";
import type { VideoPlayback } from "./video-playback";

import { iosGlassClassName } from "../../../components/ios/ios-glass";

interface VideoPreviewProps {
  aspectRatio: number;
  caption: string | null;
  isPlaying: boolean;
  labels: { pause: string; play: string };
  onPlayingChange: (isPlaying: boolean) => void;
  onTogglePlayback: () => void;
  opened: OpenedVideo;
  playbackRef: RefObject<VideoPlayback | null>;
}

/**
 * The video, decoded onto a canvas, with the caption at the playhead drawn the way iOS shows
 * subtitles. Tapping the picture plays or pauses.
 */
export function VideoPreview({
  aspectRatio,
  caption,
  isPlaying,
  labels,
  onPlayingChange,
  onTogglePlayback,
  opened,
  playbackRef,
}: VideoPreviewProps) {
  return (
    <div
      className="relative mx-auto flex max-h-[min(60dvh,36rem)] w-full items-center justify-center overflow-hidden rounded-ios-2xl bg-black"
      style={{ aspectRatio }}
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
      {caption ? (
        <Text
          aria-live="polite"
          className="pointer-events-none absolute inset-x-[8%] bottom-[7%] mx-auto w-fit max-w-[84%] rounded-ios-xs bg-black/70 px-2.5 py-1 text-center text-ios-callout font-semibold whitespace-pre-line text-white"
        >
          {caption}
        </Text>
      ) : null}
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
