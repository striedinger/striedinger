"use client";

import { CheckIcon } from "@workspace/icons/check-icon";
import { ChevronDownIcon } from "@workspace/icons/chevron-down-icon";
import { ShareUpIcon } from "@workspace/icons/share-up-icon";
import { Text } from "@workspace/ui/components/text";

import type { ChatLabels } from "./types";

import { PairingButton } from "./pairing-button";

interface PairingCodeProps {
  actionLabel: string;
  code: string;
  deliveryState: "copied" | "idle" | "shared";
  footer?: string;
  instruction: string;
  labels: ChatLabels;
  onSend: () => void;
}

/** The code this device must hand to the other one, with a share button and the raw code. */
export function PairingCode({
  actionLabel,
  code,
  deliveryState,
  footer,
  instruction,
  labels,
  onSend,
}: PairingCodeProps) {
  const delivered = deliveryState !== "idle";
  const completedLabel = deliveryState === "shared" ? labels.shared : labels.copied;

  return (
    <div className="flex flex-col gap-3">
      <Text className="px-5 text-ios-subheadline text-ios-secondary-label">{instruction}</Text>
      <PairingButton onClick={onSend} disabled={!code}>
        {delivered ? <CheckIcon strokeWidth={2.6} /> : <ShareUpIcon />}
        {delivered ? completedLabel : actionLabel}
      </PairingButton>
      <details className="group overflow-hidden rounded-ios-xl bg-ios-grouped-cell">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-[11px] outline-none select-none focus-visible:bg-ios-fill active:bg-ios-grouped-cell-pressed [&::-webkit-details-marker]:hidden">
          <Text as="span" className="text-ios-body text-ios-label">
            {labels.showCode}
          </Text>
          <ChevronDownIcon
            className="size-4 shrink-0 text-ios-tertiary-label transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
            strokeWidth={3}
          />
        </summary>
        <div className="px-4 pb-4">
          <textarea
            value={code}
            readOnly
            rows={4}
            aria-label={labels.pairingCode}
            className="w-full resize-none rounded-xl bg-ios-tertiary-fill px-3 py-2.5 font-mono text-ios-footnote break-all text-ios-label outline-none"
          />
        </div>
      </details>
      {footer ? (
        <Text className="px-5 text-ios-footnote text-ios-secondary-label">{footer}</Text>
      ) : null}
    </div>
  );
}
