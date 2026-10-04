"use client";

import { Text } from "@workspace/ui/components/text";

import type { CompressionMode, ImageOptimizerLabels, OutputFormat } from "./types";

import { IosListSection } from "../../../components/ios/ios-list-section";
import { IosSegmentedControl } from "../../../components/ios/ios-segmented-control";

interface OptimizerSettingsProps {
  autoSavingsTarget: number;
  compressionMode: CompressionMode;
  labels: ImageOptimizerLabels;
  maxDimension: number;
  onCompressionModeChange: (compressionMode: CompressionMode) => void;
  onMaxDimensionChange: (maxDimension: number) => void;
  onOutputFormatChange: (outputFormat: OutputFormat) => void;
  onQualityChange: (quality: number) => void;
  /** Called once the quality slider settles, so files re-encode once per adjustment. */
  onQualitySettle: () => void;
  outputFormat: OutputFormat;
  quality: number;
}

const maxDimensionValues = ["1280", "1920", "2560", "3840"] as const;

/** Compression options as inset grouped sections, like a settings screen. */
export function OptimizerSettings({
  autoSavingsTarget,
  compressionMode,
  labels,
  maxDimension,
  onCompressionModeChange,
  onMaxDimensionChange,
  onOutputFormatChange,
  onQualityChange,
  onQualitySettle,
  outputFormat,
  quality,
}: OptimizerSettingsProps) {
  const isLossless = compressionMode === "lossless";
  const formatOptions: { label: string; value: OutputFormat }[] = [
    { label: labels.autoFormat, value: "auto" },
    { label: labels.avif, value: "image/avif" },
    { label: labels.webp, value: "image/webp" },
    ...(isLossless ? [] : [{ label: labels.jpeg, value: "image/jpeg" as const }]),
    { label: labels.png, value: "image/png" },
  ];

  return (
    <>
      <IosListSection className="px-0" header={labels.compressionMode}>
        <li className="px-4 py-3">
          <IosSegmentedControl
            label={labels.compressionMode}
            value={compressionMode}
            onChange={onCompressionModeChange}
            options={[
              { label: labels.balancedMode, value: "balanced" },
              { label: labels.smallestMode, value: "smallest" },
              { label: labels.losslessMode, value: "lossless" },
            ]}
          />
        </li>
      </IosListSection>
      {isLossless ? null : (
        <IosListSection className="px-0" header={labels.quality} footer={labels.qualityHint}>
          <li className="flex min-h-[52px] items-center gap-3 px-4">
            <input
              type="range"
              min="35"
              max="95"
              value={quality}
              aria-label={labels.quality}
              aria-valuetext={`${quality}%`}
              onChange={function changeQuality(event) {
                onQualityChange(Number(event.target.value));
              }}
              // Re-encode once the slider settles rather than for every step while dragging.
              onPointerUp={onQualitySettle}
              onKeyUp={onQualitySettle}
              className="h-7 min-w-0 flex-1 cursor-pointer accent-ios-tint"
            />
            <Text
              as="span"
              aria-hidden="true"
              className="w-11 text-right text-ios-body text-ios-secondary-label tabular-nums"
            >
              {quality}%
            </Text>
          </li>
        </IosListSection>
      )}
      <IosListSection className="px-0" header={labels.maxDimension} footer={labels.dimensionHint}>
        <li className="px-4 py-3">
          <IosSegmentedControl
            label={labels.maxDimension}
            value={String(maxDimension)}
            disabled={isLossless}
            onChange={function changeMaxDimension(value) {
              onMaxDimensionChange(Number(value));
            }}
            options={[
              { label: labels.originalDimensions, value: "0" },
              ...maxDimensionValues.map(function createOption(value) {
                return { label: value, value };
              }),
            ]}
          />
        </li>
      </IosListSection>
      <IosListSection
        className="px-0"
        header={labels.format}
        footer={
          outputFormat === "auto" && !isLossless
            ? `${labels.autoTarget}: ~${autoSavingsTarget}% ${labels.saved}`
            : undefined
        }
      >
        <li className="px-4 py-3">
          <IosSegmentedControl
            label={labels.format}
            value={outputFormat}
            onChange={onOutputFormatChange}
            options={formatOptions}
          />
        </li>
      </IosListSection>
    </>
  );
}
