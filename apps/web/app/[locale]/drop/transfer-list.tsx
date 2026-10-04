"use client";

import { CheckIcon } from "@workspace/icons/check-icon";
import { DownloadIcon } from "@workspace/icons/download-icon";
import { FileUpIcon } from "@workspace/icons/file-up-icon";
import { RefreshIcon } from "@workspace/icons/refresh-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

import type { DropLabels, TransferItem } from "./types";

import { IosListSection } from "../../../components/ios/ios-list-section";
import { formatFileSize } from "./format-file-size";

interface TransferListProps {
  canRetry: boolean;
  items: TransferItem[];
  labels: DropLabels;
  onRetry: (transferId: string) => void;
}

const accessoryClassName =
  "flex size-9 shrink-0 items-center justify-center rounded-full bg-ios-fill text-ios-tint outline-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 active:opacity-60 disabled:text-ios-tertiary-label [&_svg]:size-[18px]";

export function TransferList({ canRetry, items, labels, onRetry }: TransferListProps) {
  const countLabel =
    items.length === 1
      ? labels.fileReady
      : labels.filesReady.replace("{count}", String(items.length));

  if (items.length === 0) {
    return (
      <section aria-label={labels.availableFiles} className="flex flex-col px-4">
        <Text
          as="h2"
          className="px-5 pt-4 pb-1.5 text-ios-subheadline font-semibold text-ios-secondary-label"
        >
          {labels.availableFiles}
        </Text>
        <Text className="rounded-ios-xl bg-ios-grouped-cell px-4 py-6 text-center text-ios-subheadline text-ios-secondary-label">
          {labels.noFiles}
        </Text>
        <Text className="px-5 pt-2 text-ios-footnote text-ios-secondary-label">
          {labels.privacy}
        </Text>
      </section>
    );
  }

  return (
    <IosListSection
      header={
        <span className="flex items-center justify-between gap-3">
          {labels.availableFiles}
          <span aria-live="polite" className="font-normal tabular-nums">
            {countLabel}
          </span>
        </span>
      }
      footer={labels.privacy}
      label={labels.availableFiles}
    >
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
            className="relative flex min-h-[64px] items-center gap-3 py-2.5 pr-4 pl-4 not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-[64px] not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-ios-separator"
          >
            <span
              aria-hidden="true"
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-ios-md text-white [&_svg]:size-[18px]",
                item.status === "error"
                  ? "bg-ios-red"
                  : item.status === "complete"
                    ? "bg-ios-green"
                    : "bg-ios-tint",
              )}
            >
              {item.direction === "incoming" ? (
                <DownloadIcon />
              ) : item.status === "complete" ? (
                <CheckIcon strokeWidth={3} />
              ) : (
                <FileUpIcon />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <Text
                as="span"
                numberOfLines={1}
                title={item.name}
                className="text-ios-body text-ios-label"
              >
                {item.name}
              </Text>
              {item.status === "sending" ? (
                <span
                  role="progressbar"
                  aria-label={`${labels.sending} ${item.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(item.progress * 100)}
                  aria-valuetext={statusLabel}
                  className="h-1 overflow-hidden rounded-full bg-ios-fill"
                >
                  <span
                    className="block h-full origin-left rounded-full bg-ios-tint transition-transform duration-150 motion-reduce:transition-none"
                    style={{ transform: `scaleX(${item.progress})` }}
                  />
                </span>
              ) : null}
              <Text
                as="span"
                className={cn(
                  "text-ios-footnote tabular-nums",
                  item.status === "error" ? "text-ios-red" : "text-ios-secondary-label",
                )}
              >
                {formatFileSize(item.size)} · {statusLabel}
              </Text>
            </span>
            {item.direction === "incoming" && item.url ? (
              <a
                href={item.url}
                download={item.name}
                aria-label={`${labels.download} ${item.name}`}
                className={accessoryClassName}
              >
                <DownloadIcon />
              </a>
            ) : item.direction === "outgoing" && item.errorReason === "send-failed" ? (
              <button
                type="button"
                aria-label={`${labels.retry} ${item.name}`}
                disabled={!canRetry}
                className={accessoryClassName}
                onClick={function retryTransfer() {
                  onRetry(item.id);
                }}
              >
                <RefreshIcon />
              </button>
            ) : null}
          </li>
        );
      })}
    </IosListSection>
  );
}
