"use client";

import { Drawer } from "@base-ui/react/drawer";
import { CheckIcon } from "@workspace/icons/check-icon";
import { CloseIcon } from "@workspace/icons/close-icon";
import { FolderIcon } from "@workspace/icons/folder-icon";

import type { NoteFolder, NotesMessages } from "./types";

import { IosBarButton } from "../../../components/ios/ios-bar-button";
import { useIosPortalContainer } from "../../../components/ios/ios-portal-container";
import { useOpenAfterMount } from "../../../components/use-open-after-mount";

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
  const portalContainer = useIosPortalContainer();
  const isOpen = useOpenAfterMount(open);

  return (
    <Drawer.Root open={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Portal container={portalContainer}>
        <Drawer.Backdrop className="fixed inset-0 z-50 bg-black opacity-[calc(0.25*(1-var(--drawer-swipe-progress)))] transition-opacity duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0 motion-reduce:transition-none" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center">
          <Drawer.Popup className="flex max-h-[85dvh] w-full max-w-xl [transform:translateY(var(--drawer-swipe-movement-y))] flex-col overflow-hidden rounded-t-ios-sheet bg-ios-grouped-background pb-[env(safe-area-inset-bottom)] text-ios-label shadow-ios-sheet transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)] data-swiping:select-none motion-reduce:transition-none">
            <div
              aria-hidden="true"
              className="mx-auto mt-1.5 h-[5px] w-9 shrink-0 rounded-full bg-ios-tertiary-label"
            />
            <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 pt-1 pb-1">
              <Drawer.Close
                render={
                  <IosBarButton aria-label={messages.Cancel} className="justify-self-start" />
                }
              >
                <CloseIcon strokeWidth={2.4} />
              </Drawer.Close>
              <Drawer.Title className="text-ios-body font-semibold">
                {messages["Move Note"]}
              </Drawer.Title>
              <span />
            </div>
            <Drawer.Content className="overflow-y-auto overscroll-contain px-4 pt-2 pb-6">
              <ul className="m-0 list-none overflow-hidden rounded-ios-xl bg-ios-grouped-cell p-0">
                {folders.map(function renderFolder(folder) {
                  const isCurrent = folder.id === currentFolderId;
                  return (
                    <li
                      key={folder.id}
                      className="relative not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-[52px] not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-ios-separator"
                    >
                      <button
                        type="button"
                        disabled={isCurrent}
                        className="flex min-h-11 w-full items-center gap-3 px-4 py-[11px] text-left text-ios-body outline-none focus-visible:bg-ios-fill active:bg-ios-grouped-cell-pressed disabled:text-ios-secondary-label"
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
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
