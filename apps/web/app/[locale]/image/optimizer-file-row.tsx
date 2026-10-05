"use client";

import { CheckIcon } from "@workspace/icons/check-icon";
import { CloseIcon } from "@workspace/icons/close-icon";
import { DownloadIcon } from "@workspace/icons/download-icon";
import { PhotoIcon } from "@workspace/icons/photo-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

import type { ImageOptimizerLabels, OptimizerItem } from "./types";

import { formatBytes } from "../../../lib/format-bytes";

interface OptimizerFileRowProps {
  item: OptimizerItem;
  labels: ImageOptimizerLabels;
  onDownload: (item: OptimizerItem) => void;
  onRemove: (id: string) => void;
}

const accessoryClassName =
  "flex size-9 shrink-0 items-center justify-center rounded-full bg-ios-fill outline-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 active:opacity-60 [&_svg]:size-4.5";

/** One image in the queue: a status glyph, its name, the size before and after, and actions. */
export function OptimizerFileRow({ item, labels, onDownload, onRemove }: OptimizerFileRowProps) {
  const savings = item.output ? Math.max(0, 1 - item.output.size / item.file.size) : 0;
  const progress = Math.round(item.progress ?? 0);
  const stageLabel = item.stage ? labels[item.stage] : labels.balanced;

  return (
    <li className="relative flex min-h-16 items-center gap-3 px-4 py-2.5 not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-16 not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-ios-separator">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-ios-md text-white [&_svg]:size-5",
          item.status === "error"
            ? "bg-ios-red"
            : item.status === "done"
              ? "bg-ios-green"
              : "bg-ios-tint",
        )}
      >
        {item.status === "done" ? <CheckIcon strokeWidth={3} /> : <PhotoIcon />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <Text
          as="span"
          numberOfLines={1}
          title={item.file.name}
          className="text-ios-body text-ios-label"
        >
          {item.file.name}
        </Text>
        {item.status === "optimizing" ? (
          <span
            role="progressbar"
            aria-label={`${stageLabel} ${item.file.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-1 overflow-hidden rounded-full bg-ios-fill"
          >
            <span
              className="block h-full rounded-full bg-ios-tint transition-[width] duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </span>
        ) : null}
        <Text
          as="span"
          aria-live="polite"
          className={cn(
            "text-ios-footnote tabular-nums",
            item.status === "error" ? "text-ios-red" : "text-ios-secondary-label",
          )}
        >
          {item.status === "error" ? (
            `${labels.error}: ${item.error}`
          ) : (
            <>
              {formatBytes(item.file.size)}
              {item.output ? ` → ${formatBytes(item.output.size)}` : null}
              {item.status === "optimizing" ? ` · ${stageLabel}… ${progress}%` : null}
              {item.status === "done" ? " · " : null}
              {item.status === "done" && savings > 0 ? (
                <span className="font-semibold text-ios-green">
                  {Math.round(savings * 100)}% {labels.saved}
                </span>
              ) : null}
              {item.status === "done" && savings === 0 ? labels.smallerFilesKept : null}
            </>
          )}
        </Text>
      </span>
      {item.output ? (
        <button
          type="button"
          aria-label={`${labels.download} ${item.file.name}`}
          className={cn(accessoryClassName, "text-ios-tint")}
          onClick={function download() {
            onDownload(item);
          }}
        >
          <DownloadIcon />
        </button>
      ) : null}
      <button
        type="button"
        aria-label={`${labels.remove} ${item.file.name}`}
        className={cn(accessoryClassName, "text-ios-secondary-label")}
        onClick={function remove() {
          onRemove(item.id);
        }}
      >
        <CloseIcon strokeWidth={2.6} />
      </button>
    </li>
  );
}
