import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "../../messages/notes/en";

export type NotesMessages = TranslationCatalog<typeof englishMessages>;

export interface NoteFolder {
  createdAt: number;
  id: string;
  name: string;
}

export interface Note {
  createdAt: number;
  deletedAt: number | null;
  folderId: string;
  html: string;
  id: string;
  pinned: boolean;
  preview: string;
  thumbnail: string | null;
  title: string;
  updatedAt: number;
}

export type NotesSortOrder = "edited" | "created" | "title";

type NotesViewMode = "list" | "gallery";

export interface NotesPreferences {
  groupByDate: boolean;
  sortOrder: NotesSortOrder;
  viewMode: NotesViewMode;
}

export interface NotesRoute {
  folderId: string | null;
  noteId: string | null;
}
