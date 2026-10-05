"use client";

import { CloseIcon } from "@workspace/icons/close-icon";
import { PlusIcon } from "@workspace/icons/plus-icon";
import { SparklesIcon } from "@workspace/icons/sparkles-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { lazy, Suspense, useState } from "react";

import type { OnDeviceAiLabels } from "../../../components/ios/ios-intelligence-card";
import type { CaptionExportMode, VideoCaption, VideoEditorLabels, VideoTrim } from "./types";

import { iosChipButtonClassName } from "../../../components/ios/ios-button-styles";
import { IosListSection } from "../../../components/ios/ios-list-section";
import { IosSegmentedControl } from "../../../components/ios/ios-segmented-control";
import { downloadBlob } from "../../../lib/download-blob";
import { captionsToWebVtt, findCaptionAt, formatClock, sortCaptions } from "./captions";
import { whisperDownloadMegabytes } from "./transcription-messages";

function loadCaptionGenerator() {
  return import("./caption-generator");
}

const CaptionGenerator = lazy(function importCaptionGenerator() {
  return loadCaptionGenerator().then(function selectCaptionGenerator(module) {
    return { default: module.CaptionGenerator };
  });
});

function preloadCaptionGenerator() {
  void loadCaptionGenerator();
}

interface VideoCaptionsSectionProps {
  aiLabels: OnDeviceAiLabels;
  canGenerate: boolean;
  captionMode: CaptionExportMode;
  captions: readonly VideoCaption[];
  currentTime: number;
  file: File;
  labels: VideoEditorLabels;
  locale: string;
  onAddCaption: () => void;
  onCaptionModeChange: (mode: CaptionExportMode) => void;
  onCaptionsChange: (captions: VideoCaption[]) => void;
  onSeek: (time: number) => void;
  trim: VideoTrim;
}

const rowClassName =
  "relative flex min-h-11 items-center gap-3 px-4 not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-4 not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-ios-separator";

/** Captions as an editable list: tap a time to jump there, type to change the words. */
export function VideoCaptionsSection({
  aiLabels,
  canGenerate,
  captionMode,
  captions,
  currentTime,
  file,
  labels,
  locale,
  onAddCaption,
  onCaptionModeChange,
  onCaptionsChange,
  onSeek,
  trim,
}: VideoCaptionsSectionProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const sortedCaptions = sortCaptions(captions);
  const showingCaption = findCaptionAt(captions, currentTime);
  const megabytes = new Intl.NumberFormat(locale, { style: "unit", unit: "megabyte" }).format(
    whisperDownloadMegabytes,
  );

  function updateText(id: string, text: string) {
    onCaptionsChange(
      captions.map(function applyText(caption) {
        return caption.id === id ? { ...caption, text } : caption;
      }),
    );
  }

  function removeCaption(id: string) {
    onCaptionsChange(
      captions.filter(function keepOther(caption) {
        return caption.id !== id;
      }),
    );
  }

  function replaceWithGenerated(generated: VideoCaption[]) {
    // Generated captions replace the ones in the transcribed range and keep the rest.
    onCaptionsChange([
      ...captions.filter(function isOutsideRange(caption) {
        return caption.end <= trim.start || caption.start >= trim.end;
      }),
      ...generated,
    ]);
  }

  function downloadCaptions() {
    const stem = file.name.replace(/\.[^.]+$/, "");
    downloadBlob(new Blob([captionsToWebVtt(captions, trim)], { type: "text/vtt" }), `${stem}.vtt`);
  }

  return (
    <div className="flex flex-col gap-3">
      <IosListSection
        className="px-0"
        header={labels.captions}
        footer={canGenerate ? labels.generateFooter.replace("{size}", megabytes) : undefined}
      >
        {sortedCaptions.length === 0 ? (
          <li className="px-4 py-3">
            <Text className="text-ios-subheadline text-ios-secondary-label">
              {labels.noCaptions}
            </Text>
          </li>
        ) : null}
        {sortedCaptions.map(function renderCaption(caption) {
          return (
            <li
              key={caption.id}
              className={cn(rowClassName, caption === showingCaption && "bg-ios-tint/10")}
            >
              <button
                type="button"
                className="shrink-0 self-start pt-3 text-ios-footnote text-ios-tint tabular-nums outline-none focus-visible:underline"
                onClick={function seekToCaption() {
                  onSeek(caption.start);
                }}
              >
                {formatClock(caption.start)}
              </button>
              <textarea
                rows={1}
                value={caption.text}
                aria-label={`${labels.captionText} ${formatClock(caption.start)}`}
                placeholder={labels.captionText}
                maxLength={200}
                className="field-sizing-content min-w-0 flex-1 resize-none bg-transparent py-2.5 text-ios-body text-ios-label caret-ios-tint outline-none placeholder:text-ios-tertiary-label"
                onChange={function editText(event) {
                  updateText(caption.id, event.currentTarget.value);
                }}
              />
              <button
                type="button"
                aria-label={`${labels.deleteCaption} ${formatClock(caption.start)}`}
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ios-fill text-ios-secondary-label outline-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 active:opacity-60 [&_svg]:size-3"
                onClick={function deleteCaption() {
                  removeCaption(caption.id);
                }}
              >
                <CloseIcon strokeWidth={2.8} />
              </button>
            </li>
          );
        })}
        <li className={rowClassName}>
          <button
            type="button"
            className="flex min-h-11 flex-1 items-center gap-3 text-ios-body text-ios-tint outline-none select-none focus-visible:underline [&_svg]:size-5"
            onClick={onAddCaption}
          >
            <PlusIcon strokeWidth={2.4} />
            {labels.addCaption}
          </button>
        </li>
        {canGenerate ? (
          <li className={rowClassName}>
            <button
              type="button"
              disabled={isGenerating}
              className="flex min-h-11 flex-1 items-center gap-3 text-ios-body text-ios-tint outline-none select-none focus-visible:underline disabled:text-ios-tertiary-label [&_svg]:size-5"
              onPointerEnter={preloadCaptionGenerator}
              onFocus={preloadCaptionGenerator}
              onClick={function generate() {
                setIsGenerating(true);
              }}
            >
              <SparklesIcon />
              {labels.generateCaptions}
            </button>
          </li>
        ) : null}
      </IosListSection>
      {isGenerating ? (
        <Suspense fallback={null}>
          <CaptionGenerator
            aiLabels={aiLabels}
            file={file}
            labels={labels}
            onCaptions={replaceWithGenerated}
            onClose={function closeGenerator() {
              setIsGenerating(false);
            }}
            trim={trim}
          />
        </Suspense>
      ) : null}
      {captions.length > 0 ? (
        <div className="flex flex-col gap-2 px-1">
          <Text className="px-4 text-ios-subheadline font-semibold text-ios-secondary-label">
            {labels.captionMode}
          </Text>
          <IosSegmentedControl
            label={labels.captionMode}
            options={[
              { label: labels.captionTrack, value: "track" },
              { label: labels.captionBurned, value: "burned" },
            ]}
            value={captionMode}
            onChange={onCaptionModeChange}
          />
          <div className="flex">
            <button type="button" className={iosChipButtonClassName} onClick={downloadCaptions}>
              {labels.downloadCaptions}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
