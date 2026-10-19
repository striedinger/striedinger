"use client";

import { CheckIcon } from "@workspace/icons/check-icon";
import { FolderIcon } from "@workspace/icons/folder-icon";

import type { NoteFolder, NotesMessages } from "./types";

import { IosSheet } from "../../../components/ios/ios-sheet";

interface NoteMoveSheetProps {
  currentFolderId: string | null;
  folders: readonly NoteFolder[];
  messages: NotesMessages;
  onMove: (folderId: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function NoteMoveSheet({
  currentFolderId,
  folders,
  messages,
  onMove,
  onOpenChange,
  open,
}: NoteMoveSheetProps) {
  return (
    <IosSheet
      open={open}
      onOpenChange={onOpenChange}
      title={messages["Move Note"]}
      closeLabel={messages.Cancel}
    >
      <ul className="m-0 list-none overflow-hidden rounded-ios-xl bg-ios-grouped-cell p-0">
        {folders.map(function renderFolder(folder) {
          const isCurrent = folder.id === currentFolderId;
          return (
            <li
              key={folder.id}
              className="relative not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-13 not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-ios-separator"
            >
              <button
                type="button"
                disabled={isCurrent}
                className="flex min-h-11 w-full items-center gap-3 px-4 py-2.75 text-left text-ios-body outline-none focus-visible:bg-ios-fill active:bg-ios-grouped-cell-pressed disabled:text-ios-secondary-label"
                onClick={function moveToFolder() {
                  onMove(folder.id);
                }}
              >
                <FolderIcon className="size-6 shrink-0 text-ios-tint" />
                <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                {isCurrent ? (
                  <CheckIcon className="size-5 text-ios-tint" strokeWidth={2.6} />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </IosSheet>
  );
}
