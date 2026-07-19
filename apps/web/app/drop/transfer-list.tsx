"use client";

import { CheckIcon } from "@workspace/icons/check-icon";
import { DownloadIcon } from "@workspace/icons/download-icon";
import { FileUpIcon } from "@workspace/icons/file-up-icon";
import { RefreshIcon } from "@workspace/icons/refresh-icon";
import { Button } from "@workspace/ui/components/button";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

import type { DropLabels, TransferItem } from "./types";

import { formatFileSize } from "./format-file-size";

interface TransferListProps {
  canRetry: boolean;
  items: TransferItem[];
  labels: DropLabels;
  onRetry: (transferId: string) => void;
}

export function TransferList({ canRetry, items, labels, onRetry }: TransferListProps) {
  return (
    <section className="flex flex-col gap-5" aria-labelledby="available-files-heading">
      <div className="flex items-center justify-between gap-4">
        <Text as="h2" id="available-files-heading" size="xl" weight="semibold">
          {labels.availableFiles}
        </Text>
        <Text
          size="sm"
          tone="muted"
          className="shrink-0 rounded-full bg-secondary px-2.5 py-1"
          aria-live="polite"
        >
          {items.length === 1
            ? labels.fileReady
            : labels.filesReady.replace("{count}", String(items.length))}
        </Text>
      </div>

      {items.length === 0 ? (
        <Surface className="flex min-h-32 animate-in items-center justify-center border-dashed bg-card/50 p-6 text-center duration-300 fade-in motion-reduce:animate-none">
          <Text tone="muted">{labels.noFiles}</Text>
        </Surface>
      ) : (
        <ul className="grid list-none gap-3 p-0 sm:grid-cols-2">
          {items.map(function renderTransfer(item) {
            const statusLabel =
              item.errorReason === "file-too-large"
                ? labels.fileTooLarge
                : item.errorReason === "invalid-payload"
                  ? labels.fileInvalid
                  : item.errorReason === "send-failed"
                    ? labels.transferFailed
                    : item.status === "waiting"
                      ? labels.waiting
                      : item.status === "sending"
                        ? `${labels.sending} ${Math.round(item.progress * 100)}%`
                        : item.direction === "incoming"
                          ? labels.download
                          : labels.directConnection;

            return (
              <li
                key={`${item.direction}-${item.id}`}
                className="[contain-intrinsic-size:auto_5rem] [content-visibility:auto]"
              >
                <Surface
                  className={cn(
                    "group relative flex min-w-0 animate-in items-center gap-4 overflow-hidden p-4 duration-300 fade-in slide-in-from-bottom-1 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-raised motion-reduce:transform-none motion-reduce:animate-none",
                    item.status === "error" && "border-destructive/30",
                  )}
                >
                  {item.status === "sending" ? (
                    <span
                      className="absolute inset-x-0 bottom-0 h-1 origin-left bg-primary transition-transform duration-150 motion-reduce:transition-none"
                      style={{ transform: `scaleX(${item.progress})` }}
                      role="progressbar"
                      aria-label={`${labels.sending} ${item.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(item.progress * 100)}
                      aria-valuetext={statusLabel}
                    />
                  ) : null}
                  <div
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none",
                      item.status === "error" && "bg-destructive/10 text-destructive",
                      item.status === "complete" && "bg-success/10 text-success",
                    )}
                    aria-hidden="true"
                  >
                    {item.direction === "incoming" && item.url ? (
                      <DownloadIcon className="size-5" />
                    ) : item.status === "complete" ? (
                      <CheckIcon className="size-5" />
                    ) : (
                      <FileUpIcon className="size-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Text weight="medium" numberOfLines={1} title={item.name}>
                      {item.name}
                    </Text>
                    <Text size="sm" tone={item.status === "error" ? "destructive" : "muted"}>
                      {formatFileSize(item.size)} · {statusLabel}
                    </Text>
                  </div>
                  {item.direction === "incoming" && item.url ? (
                    <Button
                      render={
                        <a
                          href={item.url}
                          download={item.name}
                          aria-label={`${labels.download} ${item.name}`}
                        />
                      }
                      nativeButton={false}
                      variant="ghost"
                      size="icon-lg"
                      className="size-11 hover:bg-primary hover:text-primary-foreground"
                    >
                      <DownloadIcon />
                    </Button>
                  ) : item.direction === "outgoing" && item.errorReason === "send-failed" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      className="size-11 hover:bg-primary hover:text-primary-foreground"
                      aria-label={`${labels.retry} ${item.name}`}
                      disabled={!canRetry}
                      onClick={function retryTransfer() {
                        onRetry(item.id);
                      }}
                    >
                      <RefreshIcon />
                    </Button>
                  ) : null}
                </Surface>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
