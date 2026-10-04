"use client";

import { FolderIcon } from "@workspace/icons/folder-icon";
import { PinIcon } from "@workspace/icons/pin-icon";
import { TrashIcon } from "@workspace/icons/trash-icon";
import { Text } from "@workspace/ui/components/text";

import type { IosMenuSection } from "../../../components/ios/ios-menu";
import type { Note, NotesMessages } from "./types";

import { IosContextMenu } from "../../../components/ios/ios-context-menu";
import { IosSwipeActions } from "../../../components/ios/ios-swipe-actions";
import { formatNoteListDate } from "./note-dates";

interface NoteRowProps {
  folderName: string | null;
  locale: string;
  messages: NotesMessages;
  note: Note;
  now: number;
  onDelete: (note: Note) => void;
  onMove: (note: Note) => void;
  onRecover: (note: Note) => void;
  onSelect: (note: Note) => void;
  onTogglePinned: (note: Note) => void;
  selected: boolean;
}

export function NoteRow({
  folderName,
  locale,
  messages,
  note,
  now,
  onDelete,
  onMove,
  onRecover,
  onSelect,
  onTogglePinned,
  selected,
}: NoteRowProps) {
  const isDeleted = note.deletedAt !== null;
  const title = note.title || messages["New Note"];
  const preview = note.preview || messages["No additional text"];
  const menuSections: IosMenuSection[] = isDeleted
    ? [
        {
          id: "deleted",
          actions: [
            {
              id: "recover",
              label: messages.Recover,
              icon: <FolderIcon />,
              onSelect: function recoverNote() {
                onRecover(note);
              },
            },
            {
              id: "delete",
              label: messages.Delete,
              icon: <TrashIcon />,
              destructive: true,
              onSelect: function deleteNote() {
                onDelete(note);
              },
            },
          ],
        },
      ]
    : [
        {
          id: "note",
          actions: [
            {
              id: "pin",
              label: note.pinned ? messages["Unpin Note"] : messages["Pin Note"],
              icon: <PinIcon />,
              onSelect: function togglePinned() {
                onTogglePinned(note);
              },
            },
            {
              id: "move",
              label: messages["Move Note"],
              icon: <FolderIcon />,
              onSelect: function moveNote() {
                onMove(note);
              },
            },
          ],
        },
        {
          id: "delete",
          actions: [
            {
              id: "delete",
              label: messages["Delete Note"],
              icon: <TrashIcon />,
              destructive: true,
              onSelect: function deleteNote() {
                onDelete(note);
              },
            },
          ],
        },
      ];

  return (
    <li className="relative bg-ios-grouped-cell not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-4 not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-ios-separator md:bg-ios-background md:not-last:after:right-3 md:not-last:after:left-3">
      <IosSwipeActions
        className="bg-inherit"
        leadingActions={
          isDeleted
            ? [
                {
                  id: "recover",
                  label: messages.Recover,
                  icon: <FolderIcon />,
                  colorClassName: "bg-ios-purple",
                  onSelect: function recoverNote() {
                    onRecover(note);
                  },
                },
              ]
            : [
                {
                  id: "pin",
                  label: note.pinned ? messages["Unpin Note"] : messages["Pin Note"],
                  icon: <PinIcon />,
                  colorClassName: "bg-ios-orange",
                  onSelect: function togglePinned() {
                    onTogglePinned(note);
                  },
                },
              ]
        }
        trailingActions={[
          {
            id: "delete",
            label: messages["Delete Note"],
            icon: <TrashIcon />,
            colorClassName: "bg-ios-red",
            onSelect: function deleteNote() {
              onDelete(note);
            },
          },
          ...(isDeleted
            ? []
            : [
                {
                  id: "move",
                  label: messages["Move Note"],
                  icon: <FolderIcon />,
                  colorClassName: "bg-ios-purple",
                  onSelect: function moveNote() {
                    onMove(note);
                  },
                },
              ]),
        ]}
      >
        <IosContextMenu sections={menuSections}>
          <button
            type="button"
            aria-current={selected || undefined}
            className="flex w-full items-center gap-3 py-[11px] pr-4 pl-4 text-left transition-colors duration-150 outline-none select-none hover:bg-ios-fill/40 focus-visible:bg-ios-fill active:bg-ios-grouped-cell-pressed aria-current:bg-ios-tint/25 motion-reduce:transition-none md:rounded-ios-md md:px-3 dark:aria-current:bg-ios-tint/25"
            onClick={function selectNote() {
              onSelect(note);
            }}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-px">
              <Text
                as="span"
                numberOfLines={1}
                className="text-ios-body font-semibold text-ios-label"
              >
                {title}
              </Text>
              <Text
                as="span"
                numberOfLines={1}
                className="text-ios-subheadline text-ios-secondary-label"
              >
                <span className="mr-2 text-ios-label/80 in-aria-current:text-ios-label">
                  {formatNoteListDate(note.updatedAt, locale, now)}
                </span>
                {preview}
              </Text>
              {folderName ? (
                <Text
                  as="span"
                  numberOfLines={1}
                  className="flex items-center gap-1 text-ios-subheadline text-ios-secondary-label"
                >
                  <FolderIcon className="size-4 shrink-0" />
                  {folderName}
                </Text>
              ) : null}
            </span>
            {note.thumbnail ? (
              // Note images are local data URLs, so next/image optimization does not apply.
              // oxlint-disable-next-line nextjs/no-img-element
              <img
                src={note.thumbnail}
                alt=""
                decoding="async"
                loading="lazy"
                className="size-[50px] shrink-0 rounded-md border-[0.5px] border-ios-separator object-cover"
              />
            ) : null}
          </button>
        </IosContextMenu>
      </IosSwipeActions>
    </li>
  );
}
