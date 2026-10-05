"use client";

import { DownloadIcon } from "@workspace/icons/download-icon";
import { FilmIcon } from "@workspace/icons/film-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useRef, useState, useTransition } from "react";

import type { OnDeviceAiLabels } from "../../../components/ios/ios-intelligence-card";
import type { OpenedVideo } from "./open-video";
import type {
  CaptionExportMode,
  VideoCaption,
  VideoDetails,
  VideoEditorLabels,
  VideoTrim,
} from "./types";
import type { VideoPlayback } from "./video-playback";

import { iosFilledButtonClassName } from "../../../components/ios/ios-button-styles";
import { iosGlassClassName } from "../../../components/ios/ios-glass";
import { IosListSection } from "../../../components/ios/ios-list-section";
import { iosBottomScrollEdgeClassName } from "../../../components/ios/ios-scroll-edge";
import { IosSkeleton } from "../../../components/ios/ios-skeleton";
import { IosSwitchRow } from "../../../components/ios/ios-switch-row";
import { downloadBlob } from "../../../lib/download-blob";
import { formatBytes } from "../../../lib/format-bytes";
import { createCaptionAt, findCaptionAt, formatClock } from "./captions";
import { openVideo } from "./open-video";
import { useVideoExport } from "./use-video-export";
import { VideoCaptionsSection } from "./video-captions-section";
import { VideoCoverSection } from "./video-cover-section";
import { VideoDetailsSection } from "./video-details-section";
import { VideoPreview } from "./video-preview";
import { VideoTrimBar } from "./video-trim-bar";

interface VideoWorkspaceProps {
  aiLabels: OnDeviceAiLabels;
  file: File;
  labels: VideoEditorLabels;
  locale: string;
  onChooseAnother: () => void;
}

interface VideoCover {
  blob: Blob;
  time: number;
  url: string;
}

const thumbnailCount = 10;
const thumbnailHeight = 96;

/** Everything for one video: preview, trim, captions, cover, details, and export. */
export function VideoWorkspace({
  aiLabels,
  file,
  labels,
  locale,
  onChooseAnother,
}: VideoWorkspaceProps) {
  const playbackRef = useRef<VideoPlayback | null>(null);
  const coverUrlRef = useRef<string | null>(null);
  const [opened, setOpened] = useState<OpenedVideo | null>(null);
  const [hasOpenError, setHasOpenError] = useState(false);
  const [trim, setTrim] = useState<VideoTrim>({ end: 0, start: 0 });
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbnails, setThumbnails] = useState<{ time: number; url: string }[]>([]);
  const [captions, setCaptions] = useState<VideoCaption[]>([]);
  const [captionMode, setCaptionMode] = useState<CaptionExportMode>("track");
  const [details, setDetails] = useState<VideoDetails>({
    description: "",
    removeLocation: true,
    title: "",
  });
  const [exactCuts, setExactCuts] = useState(false);
  const [cover, setCover] = useState<VideoCover | null>(null);
  const [isCapturing, startCapturing] = useTransition();
  const videoExport = useVideoExport();

  useEffect(
    function openSelectedVideo() {
      let isCurrent = true;
      let openedVideo: OpenedVideo | null = null;
      openVideo(file)
        .then(function showVideo(video) {
          openedVideo = video;
          if (!isCurrent) {
            video.dispose();
            return undefined;
          }
          setOpened(video);
          setTrim({ end: video.info.duration, start: 0 });
          setDetails({
            description: video.info.description,
            removeLocation: true,
            title: video.info.title,
          });
          return undefined;
        })
        .catch(function reportOpenError() {
          if (isCurrent) setHasOpenError(true);
        });
      return function closeVideo() {
        isCurrent = false;
        openedVideo?.dispose();
      };
    },
    [file],
  );

  useEffect(
    function renderFilmstrip() {
      if (!opened) return;
      let isCurrent = true;
      const duration = opened.info.duration;
      const times = Array.from({ length: thumbnailCount }, function spreadTime(_, index) {
        return ((index + 0.5) / thumbnailCount) * duration;
      });
      async function collectThumbnails() {
        if (!opened) return;
        for await (const thumbnail of opened.renderThumbnails(times, thumbnailHeight)) {
          if (!isCurrent) return;
          setThumbnails(function addThumbnail(current) {
            return [...current, thumbnail];
          });
        }
      }
      collectThumbnails().catch(function keepEmptyFilmstrip() {
        return undefined;
      });
      return function stopFilmstrip() {
        isCurrent = false;
      };
    },
    [opened],
  );

  useEffect(
    function followPlayback() {
      if (!isPlaying) return;
      let frame = 0;
      function readPlayhead() {
        const playback = playbackRef.current;
        if (!playback) return;
        if (playback.currentTime >= trim.end) {
          playback.pause();
          playback.seek(trim.end);
        }
        setCurrentTime(playback.currentTime);
        frame = requestAnimationFrame(readPlayhead);
      }
      frame = requestAnimationFrame(readPlayhead);
      return function stopFollowing() {
        cancelAnimationFrame(frame);
      };
    },
    [isPlaying, trim.end],
  );

  useEffect(function releaseCoverOnClose() {
    return function revokeCoverUrl() {
      if (coverUrlRef.current) URL.revokeObjectURL(coverUrlRef.current);
    };
  }, []);

  if (hasOpenError) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Text role="alert" className="px-5 text-ios-body text-ios-red">
          {labels.openFailed}
        </Text>
        <div className="flex px-1">
          <button type="button" className={iosFilledButtonClassName} onClick={onChooseAnother}>
            {labels.chooseAnother}
          </button>
        </div>
      </div>
    );
  }

  if (!opened) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3 pt-2">
        <IosSkeleton className="aspect-video w-full rounded-ios-2xl" />
        <IosSkeleton className="h-12 w-full rounded-ios-md" />
      </div>
    );
  }

  const { info } = opened;
  const canGenerateCaptions =
    info.hasAudio && typeof WebAssembly === "object" && typeof AudioDecoder === "function";
  const visibleCaption = findCaptionAt(captions, currentTime)?.text.trim() || null;
  const settingsKey = JSON.stringify({
    captionMode,
    captions,
    coverTime: cover?.time ?? null,
    details,
    exactCuts,
    trim,
  });
  const exportState = videoExport.state;
  const hasCurrentExport = exportState.kind === "done" && exportState.settingsKey === settingsKey;

  function seek(time: number) {
    playbackRef.current?.seek(time);
    setCurrentTime(time);
  }

  function togglePlayback() {
    const playback = playbackRef.current;
    if (!playback) return;
    if (!playback.paused) {
      playback.pause();
      return;
    }
    if (playback.currentTime < trim.start || playback.currentTime >= trim.end - 0.05) {
      playback.seek(trim.start);
    }
    playback.play();
  }

  function addCaption() {
    // New captions start at the playhead and stay inside the trimmed clip.
    const start = Math.min(Math.max(currentTime, trim.start), Math.max(trim.start, trim.end - 0.5));
    setCaptions([...captions, createCaptionAt(captions, start, trim.end)]);
  }

  function useCurrentFrame() {
    if (!opened) return;
    const time = playbackRef.current?.currentTime ?? currentTime;
    startCapturing(async function captureCover() {
      const blob = await opened.renderFrame(time);
      if (!blob) return;
      if (coverUrlRef.current) URL.revokeObjectURL(coverUrlRef.current);
      const url = URL.createObjectURL(blob);
      coverUrlRef.current = url;
      startCapturing(function showCover() {
        setCover({ blob, time, url });
      });
    });
  }

  function saveCover() {
    if (!cover) return;
    const stem = file.name.replace(/\.[^.]+$/, "");
    downloadBlob(cover.blob, `${stem}-cover.jpg`);
  }

  function exportVideo() {
    const stem = file.name.replace(/\.[^.]+$/, "");
    videoExport.startExport(
      {
        captionMode,
        captions,
        cover: cover?.blob ?? null,
        details,
        exactCuts,
        file,
        outputName: `${stem}-edited.mp4`,
        trim,
      },
      settingsKey,
    );
  }

  async function saveVideo() {
    if (exportState.kind !== "done") return;
    const exported = exportState.file;
    // On phones the share sheet offers Save Video to the photo library.
    if (navigator.canShare?.({ files: [exported] })) {
      try {
        await navigator.share({ files: [exported] });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    downloadBlob(exported, exported.name);
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <IosListSection className="px-0" label={labels.title}>
        <li className="flex min-h-16 items-center gap-3 px-4 py-2.5">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-ios-md bg-ios-tint text-white [&_svg]:size-5"
          >
            <FilmIcon />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Text
              as="span"
              numberOfLines={1}
              title={file.name}
              className="text-ios-body text-ios-label"
            >
              {file.name}
            </Text>
            <Text as="span" className="text-ios-footnote text-ios-secondary-label tabular-nums">
              {formatBytes(file.size)} · {formatClock(info.duration)}
            </Text>
          </span>
          <button
            type="button"
            disabled={exportState.kind === "exporting"}
            className="shrink-0 rounded-full px-2 py-1 text-ios-body text-ios-tint outline-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 active:opacity-50 disabled:text-ios-tertiary-label"
            onClick={onChooseAnother}
          >
            {labels.chooseAnother}
          </button>
        </li>
      </IosListSection>

      <VideoPreview
        aspectRatio={info.width / info.height}
        caption={visibleCaption}
        isPlaying={isPlaying}
        labels={labels}
        onPlayingChange={setIsPlaying}
        onTogglePlayback={togglePlayback}
        opened={opened}
        playbackRef={playbackRef}
      />

      <div className="flex flex-col gap-2">
        <VideoTrimBar
          currentTime={currentTime}
          duration={info.duration}
          isPlaying={isPlaying}
          labels={labels}
          onSeek={seek}
          onTogglePlayback={togglePlayback}
          onTrimChange={setTrim}
          thumbnails={thumbnails}
          trim={trim}
        />
        <Text className="px-1 text-center text-ios-footnote text-ios-secondary-label tabular-nums">
          {formatClock(trim.start)} – {formatClock(trim.end)} ·{" "}
          {labels.selected.replace("{duration}", formatClock(trim.end - trim.start))}
        </Text>
      </div>

      <IosListSection className="px-0" header={labels.trim} footer={labels.exactCutsFooter}>
        <IosSwitchRow checked={exactCuts} label={labels.exactCuts} onCheckedChange={setExactCuts} />
      </IosListSection>

      <VideoCaptionsSection
        aiLabels={aiLabels}
        canGenerate={canGenerateCaptions}
        captionMode={captionMode}
        captions={captions}
        currentTime={currentTime}
        file={file}
        labels={labels}
        locale={locale}
        onAddCaption={addCaption}
        onCaptionModeChange={setCaptionMode}
        onCaptionsChange={setCaptions}
        onSeek={seek}
        trim={trim}
      />

      <VideoCoverSection
        cover={cover}
        isCapturing={isCapturing}
        labels={labels}
        onSaveCover={saveCover}
        onUseCurrentFrame={useCurrentFrame}
      />

      <VideoDetailsSection
        details={details}
        fileSize={file.size}
        info={info}
        labels={labels}
        onDetailsChange={setDetails}
      />

      {exportState.kind === "error" ? (
        <Text role="alert" className="px-5 text-ios-footnote text-ios-red">
          {labels.exportFailed}
        </Text>
      ) : null}

      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-3 px-4 pt-8 pb-safe-min-3.5",
          iosBottomScrollEdgeClassName,
        )}
      >
        {exportState.kind === "exporting" ? (
          <>
            <div
              role="progressbar"
              aria-label={labels.export}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(exportState.progress * 100)}
              className={cn(
                "pointer-events-auto relative flex h-12.5 w-full max-w-xs items-center justify-center overflow-hidden rounded-full",
                iosGlassClassName,
              )}
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 bg-ios-tint/25 transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${exportState.progress * 100}%` }}
              />
              <Text
                as="span"
                className="relative text-ios-body font-semibold text-ios-label tabular-nums"
              >
                {labels.exporting.replace(
                  "{percent}",
                  `${Math.round(exportState.progress * 100)}%`,
                )}
              </Text>
            </div>
            <button
              type="button"
              className={cn(
                "pointer-events-auto flex h-12.5 shrink-0 items-center rounded-full px-5 text-ios-body font-semibold text-ios-red outline-none focus-visible:ring-2 focus-visible:ring-ios-tint/60 active:scale-[0.97]",
                iosGlassClassName,
              )}
              onClick={videoExport.cancelExport}
            >
              {labels.cancel}
            </button>
          </>
        ) : hasCurrentExport ? (
          <button
            type="button"
            className={cn(iosFilledButtonClassName, "pointer-events-auto w-full max-w-sm")}
            onClick={function save() {
              void saveVideo();
            }}
          >
            <DownloadIcon strokeWidth={2.4} />
            {labels.saveVideo}
          </button>
        ) : (
          <button
            type="button"
            className={cn(iosFilledButtonClassName, "pointer-events-auto w-full max-w-sm")}
            onClick={exportVideo}
          >
            {labels.export}
          </button>
        )}
      </div>
    </div>
  );
}
