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
        ref={videoRef}
        playsInline
        preload="auto"
        className="absolute inset-0 size-full object-contain"
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
        <source
          ref={function attachSource(source: HTMLSourceElement | null) {
            const video = source?.parentElement;
            if (!source || !(video instanceof HTMLVideoElement)) return;
            // The file plays straight from disk through an object URL, released with the editor.
            // iOS Safari only starts blob URLs from a typed <source>, not the video's src, and
            // the #t fragment makes it paint the first frame instead of a black box.
            const url = URL.createObjectURL(file);
            const type = findPlayableType(video, file);
            if (type) source.type = type;
            source.src = `${url}#t=0.001`;
            video.load();
            return function releaseSource() {
              URL.revokeObjectURL(url);
            };
          }}
        />
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

const typesByExtension: Record<string, string> = {
  m4v: "video/mp4",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  mp4: "video/mp4",
  webm: "video/webm",
};

/**
 * The MIME type to label the file's <source> with, so the browser does not skip it. Chrome
 * reports no support for QuickTime but plays H.264 and HEVC movies labelled as MP4.
 */
function findPlayableType(video: HTMLVideoElement, file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const type = file.type || typesByExtension[extension];
  if (!type) return undefined;
  if (video.canPlayType(type)) return type;
  if (type === "video/quicktime" && video.canPlayType("video/mp4")) return "video/mp4";
  // An unlabelled source is still tried, which beats one the browser refuses outright.
  return undefined;
}
