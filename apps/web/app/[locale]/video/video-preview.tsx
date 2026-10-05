"use client";

import type { RefObject } from "react";

import { PauseFillIcon } from "@workspace/icons/pause-fill-icon";
import { PlayFillIcon } from "@workspace/icons/play-fill-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

import { iosGlassClassName } from "../../../components/ios/ios-glass";

interface VideoPreviewProps {
  aspectRatio: number;
  caption: string | null;
  /** The captions as WebVTT, offered to assistive technology and the browser's own controls. */
  captionsUrl: string;
  file: File;
  isPlaying: boolean;
  labels: { captions: string; pause: string; play: string };
  locale: string;
  onPlayingChange: (isPlaying: boolean) => void;
  onTimeChange: (time: number) => void;
  onTogglePlayback: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
}

/**
 * The native video element, played from the file on disk, with the caption at the playhead
 * drawn the way iOS shows subtitles. Tapping the picture plays or pauses.
 */
export function VideoPreview({
  aspectRatio,
  caption,
  captionsUrl,
  file,
  isPlaying,
  labels,
  locale,
  onPlayingChange,
  onTimeChange,
  onTogglePlayback,
  videoRef,
}: VideoPreviewProps) {
  return (
    <div
      className="relative mx-auto flex max-h-[min(60dvh,36rem)] w-full items-center justify-center overflow-hidden rounded-ios-2xl bg-black"
      style={{ aspectRatio }}
    >
      <video
        ref={function attachVideo(video: HTMLVideoElement | null) {
          videoRef.current = video;
          if (!video) return;
          // The file plays straight from disk through an object URL, released with the editor.
          const url = URL.createObjectURL(file);
          video.src = url;
          return function releaseVideo() {
            videoRef.current = null;
            URL.revokeObjectURL(url);
          };
        }}
        playsInline
        preload="auto"
        className="size-full object-contain"
        onClick={onTogglePlayback}
        onPlay={function markPlaying() {
          onPlayingChange(true);
        }}
        onPause={function markPaused() {
          onPlayingChange(false);
        }}
        onSeeked={function reportSeek(event) {
          onTimeChange(event.currentTarget.currentTime);
        }}
        onLoadedMetadata={function reportStart(event) {
          onTimeChange(event.currentTarget.currentTime);
        }}
      >
        <track kind="captions" src={captionsUrl} srcLang={locale} label={labels.captions} />
      </video>
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
