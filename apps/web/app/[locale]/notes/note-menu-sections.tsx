import { FolderIcon } from "@workspace/icons/folder-icon";
import { PinIcon } from "@workspace/icons/pin-icon";
import { TrashIcon } from "@workspace/icons/trash-icon";

import type { IosMenuSection } from "../../../components/ios/ios-menu";
import type { Note, NotesMessages } from "./types";

export interface NoteMenuActions {
  onDelete: (note: Note) => void;
  onMove: (note: Note) => void;
  onRecover: (note: Note) => void;
  onTogglePinned: (note: Note) => void;
}

/**
 * A note's actions, shared by the list row's context menu and the open note's More menu:
 * pin, move, and delete, or recover and delete for a note in Recently Deleted.
 */
export function createNoteMenuSections(
  note: Note,
  messages: NotesMessages,
  { onDelete, onMove, onRecover, onTogglePinned }: NoteMenuActions,
): IosMenuSection[] {
  function deleteNote() {
    onDelete(note);
  }
  if (note.deletedAt !== null) {
    return [
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
            onSelect: deleteNote,
          },
        ],
      },
    ];
  }
  return [
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
          onSelect: deleteNote,
        },
      ],
    },
  ];
}
