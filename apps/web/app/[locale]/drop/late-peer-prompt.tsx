"use client";

import { ShareUpIcon } from "@workspace/icons/share-up-icon";
import { cn } from "@workspace/ui/lib/utils";

import type { DropLabels } from "./types";

import { IosListSection } from "../../../components/ios/ios-list-section";

interface LatePeerPromptProps {
  fileCount: number;
  labels: DropLabels;
  onDismiss: () => void;
  onSend: () => void;
}

const rowButtonClassName =
  "flex min-h-12 w-full items-center gap-3 px-4 text-left text-ios-body transition-colors duration-150 outline-none select-none focus-visible:bg-ios-fill active:bg-ios-grouped-cell-pressed motion-reduce:transition-none [&_svg]:size-5";

/** Asks before sending files shared earlier to a device that joined after them. */
export function LatePeerPrompt({ fileCount, labels, onDismiss, onSend }: LatePeerPromptProps) {
  const sendLabel =
    fileCount === 1 ? labels.sendOneFile : labels.sendFiles.replace("{count}", String(fileCount));

  return (
    <div role="status" aria-live="polite">
      <IosListSection
        header={labels.latePeerJoined}
        footer={labels.latePeerHint}
        label={labels.latePeerJoined}
      >
        <li className="relative after:absolute after:right-0 after:bottom-0 after:left-4 after:h-px after:scale-y-50 after:bg-ios-separator">
          <button
            type="button"
            className={cn(rowButtonClassName, "font-semibold text-ios-tint")}
            onClick={onSend}
          >
            <ShareUpIcon />
            {sendLabel}
          </button>
        </li>
        <li>
          <button
            type="button"
            className={cn(rowButtonClassName, "text-ios-secondary-label")}
            onClick={onDismiss}
          >
            {labels.notNow}
          </button>
        </li>
      </IosListSection>
    </div>
  );
}
