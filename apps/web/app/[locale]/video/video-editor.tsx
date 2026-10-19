"use client";

import { FilmIcon } from "@workspace/icons/film-icon";
import { PlusIcon } from "@workspace/icons/plus-icon";
import { cn } from "@workspace/ui/lib/utils";
import { lazy, Suspense, useRef, useState, useSyncExternalStore } from "react";

import type { OnDeviceAiLabels } from "../../../components/ios/ios-intelligence-card";
import type { VideoEditorLabels } from "./types";

import { iosFilledButtonClassName } from "../../../components/ios/ios-button-styles";
import { IosFileDropZone } from "../../../components/ios/ios-file-drop-zone";
import { IosFileEmptyState } from "../../../components/ios/ios-file-empty-state";
import { IosFloatingActionBar } from "../../../components/ios/ios-floating-action-bar";
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
        <IosFileEmptyState
          icon={<FilmIcon />}
          title={labels.dropPrompt}
          description={isSupported ? labels.supported : labels.unsupported}
          note={labels.privacy}
        />
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
        <IosFloatingActionBar>
          <button
            type="button"
            disabled={!isSupported}
            className={cn(iosFilledButtonClassName, "pointer-events-auto w-full max-w-sm")}
            onClick={openFilePicker}
          >
            <PlusIcon strokeWidth={2.8} />
            {labels.chooseVideo}
          </button>
        </IosFloatingActionBar>
      )}
    </div>
  );
}
