"use client";

import { FilmIcon } from "@workspace/icons/film-icon";
import { PlusIcon } from "@workspace/icons/plus-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { lazy, Suspense, useRef, useState, useSyncExternalStore } from "react";

import type { OnDeviceAiLabels } from "../../../components/ios/ios-intelligence-card";
import type { VideoEditorLabels } from "./types";

import { iosFilledButtonClassName } from "../../../components/ios/ios-button-styles";
import { IosContentUnavailable } from "../../../components/ios/ios-content-unavailable";
import { IosFileDropZone } from "../../../components/ios/ios-file-drop-zone";
import { iosBottomScrollEdgeClassName } from "../../../components/ios/ios-scroll-edge";
import { IosSkeleton } from "../../../components/ios/ios-skeleton";

// Reading, previewing, and exporting video pulls in Mediabunny, so it loads once a video is chosen.
const VideoWorkspace = lazy(function importVideoWorkspace() {
  return import("./video-workspace").then(function selectVideoWorkspace(module) {
    return { default: module.VideoWorkspace };
  });
});

interface VideoEditorProps {
  aiLabels: OnDeviceAiLabels;
  labels: VideoEditorLabels;
  locale: string;
}

const acceptedVideoTypes =
  "video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.m4v,.mov,.webm,.mkv";

function subscribeToNothing() {
  return function unsubscribeFromNothing() {};
}

/** WebCodecs decodes and encodes frames; without it there is nothing to edit with. */
function readSupport() {
  return typeof VideoDecoder === "function" && typeof Worker === "function";
}

function readServerSupport() {
  return true;
}

function isVideoFile(file: File) {
  return file.type.startsWith("video/") || /\.(?:mp4|m4v|mov|webm|mkv)$/i.test(file.name);
}

export function VideoEditor({ aiLabels, labels, locale }: VideoEditorProps) {
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSupported = useSyncExternalStore(subscribeToNothing, readSupport, readServerSupport);

  function chooseFile(files: readonly File[]) {
    const video = files.find(isVideoFile);
    if (video) setFile(video);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  return (
    <div className="flex flex-col gap-2 pb-20">
      {file ? (
        <Suspense
          fallback={
            <div aria-busy="true" className="flex flex-col gap-3 pt-2">
              <IosSkeleton className="aspect-video w-full rounded-ios-2xl" />
              <IosSkeleton className="h-12 w-full rounded-ios-md" />
            </div>
          }
        >
          <VideoWorkspace
            key={`${file.name}-${file.size}-${file.lastModified}`}
            aiLabels={aiLabels}
            file={file}
            labels={labels}
            locale={locale}
            onChooseAnother={openFilePicker}
          />
        </Suspense>
      ) : (
        <div className="flex flex-col pt-2">
          <div className="rounded-ios-2xl border-2 border-dashed border-ios-separator bg-ios-grouped-cell">
            <IosContentUnavailable
              className="px-6 pt-12 pb-12"
              icon={<FilmIcon />}
              title={labels.dropPrompt}
              description={isSupported ? labels.supported : labels.unsupported}
            />
          </div>
          <Text className="px-5 pt-2 text-ios-footnote text-ios-secondary-label">
            {labels.privacy}
          </Text>
        </div>
      )}
      <IosFileDropZone label={labels.dropActive} onFiles={chooseFile} />
      <input
        ref={fileInputRef}
        className="sr-only"
        type="file"
        accept={acceptedVideoTypes}
        tabIndex={-1}
        aria-hidden="true"
        onChange={function selectVideo(event) {
          chooseFile(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = "";
        }}
      />
      {file ? null : (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pt-8 pb-safe-min-3.5",
            iosBottomScrollEdgeClassName,
          )}
        >
          <button
            type="button"
            disabled={!isSupported}
            className={cn(iosFilledButtonClassName, "pointer-events-auto w-full max-w-sm")}
            onClick={openFilePicker}
          >
            <PlusIcon strokeWidth={2.8} />
            {labels.chooseVideo}
          </button>
        </div>
      )}
    </div>
  );
}
