import type { ReactNode } from "react";

import { CloseIcon } from "@workspace/icons/close-icon";
import { SparklesIcon } from "@workspace/icons/sparkles-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

import { IosBarButton } from "./ios-bar-button";

export interface OnDeviceAiLabels {
  /** Includes `{percent}`. */
  downloading: string;
  failed: string;
  onDevice: string;
  working: string;
}

export type IosIntelligenceStatus =
  | { kind: "idle" }
  | { kind: "downloading"; progress: number }
  | { kind: "working" }
  | { kind: "done" }
  | { kind: "error" };

interface IosIntelligenceCardProps {
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  /** With `onClose`, the title row ends in a close button with this label. */
  closeLabel?: string;
  labels: OnDeviceAiLabels;
  onClose?: () => void;
  status: IosIntelligenceStatus;
  title: string;
}

/**
 * A card for on-device AI results, edged in Apple Intelligence's colors. The edge turns and
 * glows while the model downloads or writes, and the footnote says where the result was made.
 */
export function IosIntelligenceCard({
  actions,
  children,
  className,
  closeLabel,
  labels,
  onClose,
  status,
  title,
}: IosIntelligenceCardProps) {
  const isBusy = status.kind === "downloading" || status.kind === "working";

  return (
    <div className={cn("relative isolate rounded-ios-xl p-0.5", className)}>
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-0 -z-10 rounded-ios-xl bg-ios-intelligence opacity-70 motion-safe:animate-ios-intelligence",
          !isBusy && "motion-safe:paused",
        )}
      />
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-1 -z-20 rounded-ios-xl bg-ios-intelligence blur-xl transition-opacity duration-500 motion-safe:animate-ios-intelligence motion-reduce:transition-none",
          isBusy ? "opacity-50" : "opacity-0",
        )}
      />
      <section
        aria-busy={isBusy}
        className="flex flex-col gap-3 rounded-ios-lg bg-ios-grouped-cell px-4 py-3.5"
      >
        <div className="flex min-h-7 items-center gap-2">
          <SparklesIcon aria-hidden="true" className="size-4.5 shrink-0 text-ios-purple" />
          <Text
            as="h3"
            className="min-w-0 flex-1 text-ios-subheadline font-semibold text-ios-label"
          >
            {title}
          </Text>
          {onClose ? (
            <IosBarButton
              variant="plain"
              className="-my-2 -mr-2 size-9 min-w-9 text-ios-secondary-label [&_svg]:size-4"
              aria-label={closeLabel}
              onClick={onClose}
            >
              <CloseIcon strokeWidth={2.6} />
            </IosBarButton>
          ) : null}
        </div>
        {children}
        {status.kind === "working" && !children ? (
          <div aria-hidden="true" className="flex flex-col gap-2">
            <span className="h-3 w-11/12 animate-pulse rounded-full bg-ios-fill" />
            <span className="h-3 w-3/4 animate-pulse rounded-full bg-ios-fill" />
          </div>
        ) : null}
        <Text
          aria-live="polite"
          className={cn(
            "text-ios-footnote empty:hidden",
            status.kind === "error" ? "text-ios-red" : "text-ios-secondary-label",
          )}
        >
          {status.kind === "downloading"
            ? labels.downloading.replace("{percent}", `${Math.round(status.progress * 100)}%`)
            : status.kind === "working"
              ? labels.working
              : status.kind === "error"
                ? labels.failed
                : status.kind === "done"
                  ? labels.onDevice
                  : ""}
        </Text>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </section>
    </div>
  );
}
