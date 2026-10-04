"use client";

import { CheckIcon } from "@workspace/icons/check-icon";
import { Text } from "@workspace/ui/components/text";

import type { PdfToolLabels } from "./types";

import { IosListSection } from "../../../components/ios/ios-list-section";
import { formatBytes } from "./format-bytes";

interface PdfStatusSectionProps {
  isProcessing: boolean;
  labels: PdfToolLabels;
  onDownload: () => void;
  originalSize: number;
  progress: number;
  result?: { name: string; size: number; unlocked: boolean };
  stageLabel: string;
}

/** Progress while a PDF is processed, then the finished file with its savings and download. */
export function PdfStatusSection({
  isProcessing,
  labels,
  onDownload,
  originalSize,
  progress,
  result,
  stageLabel,
}: PdfStatusSectionProps) {
  const roundedProgress = Math.round(progress);

  if (isProcessing) {
    return (
      <IosListSection className="px-0" footer={labels.fileStaysLocal} label={stageLabel}>
        <li aria-live="polite" className="flex flex-col gap-2.5 px-4 py-3.5">
          <span className="flex items-center justify-between gap-3">
            <Text as="span" className="text-ios-body text-ios-label">
              {stageLabel}…
            </Text>
            <Text as="span" className="text-ios-body text-ios-secondary-label tabular-nums">
              {roundedProgress}%
            </Text>
          </span>
          <span
            role="progressbar"
            aria-label={stageLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={roundedProgress}
            className="bg-ios-fill h-1 overflow-hidden rounded-full"
          >
            <span
              className="bg-ios-tint block h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </span>
        </li>
      </IosListSection>
    );
  }

  if (!result) return null;
  const savings = Math.max(0, 1 - result.size / originalSize);
  const title = result.unlocked ? labels.unlockComplete : labels.result;

  return (
    <IosListSection className="px-0" header={title} label={title}>
      <li className="flex min-h-[64px] items-center gap-3 px-4 py-2.5">
        <span
          aria-hidden="true"
          className="bg-ios-green flex size-9 shrink-0 items-center justify-center rounded-[10px] text-white [&_svg]:size-5"
        >
          <CheckIcon strokeWidth={3} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Text
            as="span"
            numberOfLines={1}
            title={result.name}
            className="text-ios-body text-ios-label"
          >
            {result.name}
          </Text>
          <Text as="span" className="text-ios-footnote text-ios-secondary-label tabular-nums">
            {formatBytes(originalSize)} → {formatBytes(result.size)}
            {result.unlocked ? null : " · "}
            {!result.unlocked && savings > 0 ? (
              <span className="text-ios-green font-semibold">
                {Math.round(savings * 100)}% {labels.saved}
              </span>
            ) : null}
            {!result.unlocked && savings === 0 ? labels.noSmallerResult : null}
          </Text>
        </span>
        <button
          type="button"
          aria-label={`${labels.download} ${result.name}`}
          className="bg-ios-tint focus-visible:ring-ios-tint/50 h-8 shrink-0 rounded-full px-4 text-[15px] font-semibold text-white outline-none focus-visible:ring-2 active:opacity-70"
          onClick={onDownload}
        >
          {labels.download}
        </button>
      </li>
    </IosListSection>
  );
}
