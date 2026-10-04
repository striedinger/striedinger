"use client";

import { RefreshIcon } from "@workspace/icons/refresh-icon";
import { useState } from "react";

import { IosAlert } from "../../../components/ios/ios-alert";

interface RestartGameDialogProps {
  cancelLabel: string;
  confirmLabel: string;
  description: string;
  onConfirm: () => void;
  title: string;
  triggerLabel: string;
}

/** A restart button that asks for confirmation with an iOS alert. */
export function RestartGameDialog({
  cancelLabel,
  confirmLabel,
  description,
  onConfirm,
  title,
  triggerLabel,
}: RestartGameDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={triggerLabel}
        className="flex w-14 shrink-0 items-center justify-center rounded-ios-lg bg-ios-grouped-cell text-ios-tint outline-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 active:scale-[0.94] active:bg-ios-grouped-cell-pressed motion-safe:transition-transform [&_svg]:size-[22px]"
        onClick={function openRestartAlert() {
          setIsOpen(true);
        }}
      >
        <RefreshIcon />
      </button>
      <IosAlert
        open={isOpen}
        onOpenChange={setIsOpen}
        title={title}
        message={description}
        actions={[
          {
            label: cancelLabel,
            role: "cancel",
            onSelect: function cancelRestart() {
              setIsOpen(false);
            },
          },
          {
            label: confirmLabel,
            role: "destructive",
            onSelect: function confirmRestart() {
              setIsOpen(false);
              onConfirm();
            },
          },
        ]}
      />
    </>
  );
}
