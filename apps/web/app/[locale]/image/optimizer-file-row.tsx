"use client";

import { Button } from "@workspace/ui/components/button";
import { Text } from "@workspace/ui/components/text";

import type { ImageOptimizerLabels, OptimizerItem } from "./types";

interface OptimizerFileRowProps {
  item: OptimizerItem;
  labels: ImageOptimizerLabels;
  onDownload: (item: OptimizerItem) => void;
  onRemove: (id: string) => void;
}

export function OptimizerFileRow({ item, labels, onDownload, onRemove }: OptimizerFileRowProps) {
  const savings = item.output ? Math.max(0, 1 - item.output.size / item.file.size) : 0;
  const progress = item.progress ?? 0;
  const stageLabel = item.stage ? labels[item.stage] : labels.balanced;

  return (
    <li className="grid gap-4 border-t border-border/70 px-4 py-4 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
      <div className="min-w-0">
        <Text weight="medium" className="truncate">
          {item.file.name}
        </Text>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Text size="sm" tone="muted">
            {formatBytes(item.file.size)} {labels.original}
          </Text>
          {item.output ? (
            <Text size="sm" tone="muted">
              → {formatBytes(item.output.size)} {labels.output}
            </Text>
          ) : null}
          {item.status === "optimizing" ? (
            <Text size="sm" className="text-primary tabular-nums" aria-live="polite">
              {stageLabel}… {Math.round(progress)}%
            </Text>
          ) : null}
          {item.status === "done" ? (
            <Text size="sm" className="text-success">
              {savings > 0
                ? `${Math.round(savings * 100)}% ${labels.saved}`
                : labels.smallerFilesKept}
            </Text>
          ) : null}
          {item.error ? (
            <Text size="sm" className="text-destructive">
              {labels.error}: {item.error}
            </Text>
          ) : null}
        </div>
        {item.status === "optimizing" ? (
          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/10"
            role="progressbar"
            aria-label={`${stageLabel} ${item.file.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <div
              className="h-full animate-pulse rounded-full bg-primary transition-[width] duration-500 ease-out motion-reduce:animate-none motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
      </div>
      <div className="flex gap-2">
        {item.output ? (
          <Button
            type="button"
            size="sm"
            onClick={function download() {
              onDownload(item);
            }}
          >
            {labels.download}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label={`Remove ${item.file.name}`}
          onClick={function remove() {
            onRemove(item.id);
          }}
        >
          ×
        </Button>
      </div>
    </li>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1_000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
