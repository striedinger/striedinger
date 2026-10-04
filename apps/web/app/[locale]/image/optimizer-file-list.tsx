"use client";

import { DownloadIcon } from "@workspace/icons/download-icon";
import { TrashIcon } from "@workspace/icons/trash-icon";
import { cn } from "@workspace/ui/lib/utils";

import type { ImageOptimizerLabels, OptimizerItem } from "./types";

import { IosListSection } from "../../../components/ios/ios-list-section";
import { OptimizerFileRow } from "./optimizer-file-row";

interface OptimizerFileListProps {
  items: OptimizerItem[];
  labels: ImageOptimizerLabels;
  maxFiles: number;
  onClear: () => void;
  onDownload: (item: OptimizerItem) => void;
  onRemove: (id: string) => void;
}

const actionRowClassName =
  "flex min-h-12 w-full items-center gap-3 px-4 text-left text-ios-body transition-colors duration-150 outline-none select-none focus-visible:bg-ios-fill active:bg-ios-grouped-cell-pressed motion-reduce:transition-none [&_svg]:size-5";

/** The queued images as an inset grouped list, followed by actions for the whole batch. */
export function OptimizerFileList({
  items,
  labels,
  maxFiles,
  onClear,
  onDownload,
  onRemove,
}: OptimizerFileListProps) {
  const completed = items.filter(function hasOutput(item) {
    return item.output;
  });

  return (
    <>
      <IosListSection
        className="px-0"
        header={
          <span className="flex items-center justify-between gap-3">
            {labels.queue}
            <span className="font-normal tabular-nums">
              {items.length} / {maxFiles}
            </span>
          </span>
        }
        footer={labels.privacy}
        label={labels.queue}
      >
        {items.map(function renderItem(item) {
          return (
            <OptimizerFileRow
              key={item.id}
              item={item}
              labels={labels}
              onDownload={onDownload}
              onRemove={onRemove}
            />
          );
        })}
      </IosListSection>
      <IosListSection className="px-0">
        {completed.length > 1 ? (
          <li className="relative after:absolute after:right-0 after:bottom-0 after:left-12 after:h-px after:scale-y-50 after:bg-ios-separator">
            <button
              type="button"
              className={cn(actionRowClassName, "text-ios-tint")}
              onClick={function downloadAll() {
                completed.forEach(onDownload);
              }}
            >
              <DownloadIcon />
              {labels.downloadAll}
            </button>
          </li>
        ) : null}
        <li>
          <button
            type="button"
            className={cn(actionRowClassName, "text-ios-red")}
            onClick={onClear}
          >
            <TrashIcon />
            {labels.clearAll}
          </button>
        </li>
      </IosListSection>
    </>
  );
}
