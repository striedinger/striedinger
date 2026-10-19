"use client";

import { Text } from "@workspace/ui/components/text";

import type { ExportResolution } from "./export-size";

import { IosSegmentedControl } from "../../../components/ios/ios-segmented-control";
import { formatBytes } from "../../../lib/format-bytes";

interface VideoExportSizeSectionProps {
  estimatedBytes: number;
  labels: { about: string; exportSize: string; original: string };
  onResolutionChange: (resolution: ExportResolution) => void;
  resolution: ExportResolution;
  resolutions: readonly ExportResolution[];
}

/** Picks the export's resolution and shows roughly how large the file will be. */
export function VideoExportSizeSection({
  estimatedBytes,
  labels,
  onResolutionChange,
  resolution,
  resolutions,
}: VideoExportSizeSectionProps) {
  return (
    <div className="flex flex-col gap-2 px-1">
      <Text className="px-4 text-ios-subheadline font-semibold text-ios-secondary-label">
        {labels.exportSize}
      </Text>
      {resolutions.length > 1 ? (
        <IosSegmentedControl
          label={labels.exportSize}
          options={resolutions.map(function toOption(option) {
            return { label: option === "original" ? labels.original : `${option}p`, value: option };
          })}
          value={resolution}
          onChange={onResolutionChange}
        />
      ) : null}
      <Text className="px-4 text-ios-footnote text-ios-secondary-label tabular-nums">
        {labels.about.replace("{size}", formatBytes(estimatedBytes))}
      </Text>
    </div>
  );
}
