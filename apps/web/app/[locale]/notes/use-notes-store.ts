"use client";

import { startTransition, useEffect, useRef, useState } from "react";

import type { Note, NoteFolder, NotesPreferences } from "./types";

import { readStoredValue, writeStoredValue } from "../../../lib/browser-storage";
import { emptyNoteHtml, summarizeNoteHtml } from "./note-html";
import {
  deleteFolders,
  deleteNotes,
  readStoredNotes,
  saveFolders,
  saveNotes,
} from "./notes-database";

export const defaultFolderId = "notes";
export const allNotesFolderId = "all";
export const recentlyDeletedFolderId = "deleted";

const preferencesStorageKey = "ios-notes:preferences:v1";
const seededStorageKey = "ios-notes:seeded:v1";
const deletedRetentionMilliseconds = 30 * 86_400_000;
const defaultPreferences: NotesPreferences = {
  groupByDate: true,
  sortOrder: "edited",
  viewMode: "list",
};

interface UseNotesStoreOptions {
  welcomeNoteHtml: string;
}

function createNoteId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function isNoteEmpty(note: Note) {
  return !note.title && !note.preview && !note.thumbnail;
}

export function useNotesStore({ welcomeNoteHtml }: UseNotesStoreOptions) {
  const [isReady, setIsReady] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [preferences, setPreferences] = useState<NotesPreferences>(defaultPreferences);
  const persistedNotesRef = useRef(new Map<string, Note>());
  const persistedFoldersRef = useRef(new Map<string, NoteFolder>());

  useEffect(
    function loadNotes() {
      let cancelled = false;
      async function restoreStoredNotes() {
        const stored = await readStoredNotes();
        if (cancelled) return;
        const now = Date.now();
        const retainedNotes = stored.notes.filter(function isWithinRetention(note) {
          return note.deletedAt === null || now - note.deletedAt < deletedRetentionMilliseconds;
        });
        persistedNotesRef.current = new Map(
          stored.notes.map(function indexNote(note) {
            return [note.id, note];
          }),
        );
        persistedFoldersRef.current = new Map(
          stored.folders.map(function indexFolder(folder) {
            return [folder.id, folder];
          }),
        );
        const shouldSeed =
          stored.notes.length === 0 &&
          stored.folders.length === 0 &&
          !readStoredValue(seededStorageKey);
        if (shouldSeed) {
          writeStoredValue(seededStorageKey, "1");
          retainedNotes.push(createNoteRecord(defaultFolderId, welcomeNoteHtml, now));
        }
        setNotes(retainedNotes);
        setFolders(stored.folders);
        setPreferences(readPreferences());
        setIsReady(true);
      }
      void restoreStoredNotes();
      return function cancelNotesRestore() {
        cancelled = true;
      };
    },
    [welcomeNoteHtml],
  );

  // IndexedDB mirrors React state: only records whose identity changed are written.
  useEffect(
    function persistChangedNotes() {
      if (!isReady) return;
      const persisted = persistedNotesRef.current;
      const changedNotes = notes.filter(function hasChanged(note) {
        return persisted.get(note.id) !== note;
      });
      const currentIds = new Set(
        notes.map(function selectId(note) {
          return note.id;
        }),
      );
      const removedIds = Array.from(persisted.keys()).filter(function wasRemoved(id) {
        return !currentIds.has(id);
      });
      if (changedNotes.length > 0) void saveNotes(changedNotes);
      if (removedIds.length > 0) void deleteNotes(removedIds);
      persistedNotesRef.current = new Map(
        notes.map(function indexNote(note) {
          return [note.id, note];
        }),
      );
    },
    [isReady, notes],
  );

  useEffect(
    function persistChangedFolders() {
      if (!isReady) return;
      const persisted = persistedFoldersRef.current;
      const changedFolders = folders.filter(function hasChanged(folder) {
        return persisted.get(folder.id) !== folder;
      });
      const currentIds = new Set(
        folders.map(function selectId(folder) {
          return folder.id;
        }),
      );
      const removedIds = Array.from(persisted.keys()).filter(function wasRemoved(id) {
        return !currentIds.has(id);
      });
      if (changedFolders.length > 0) void saveFolders(changedFolders);
      if (removedIds.length > 0) void deleteFolders(removedIds);
      persistedFoldersRef.current = new Map(
        folders.map(function indexFolder(folder) {
          return [folder.id, folder];
        }),
      );
    },
    [isReady, folders],
  );

  function updateNote(noteId: string, update: (note: Note) => Note) {
    setNotes(function applyNoteUpdate(currentNotes) {
      return currentNotes.map(function updateMatchingNote(note) {
        return note.id === noteId ? update(note) : note;
      });
    });
  }

  function createNote(folderId: string) {
    const note = createNoteRecord(folderId, emptyNoteHtml, Date.now());
    setNotes(function addNote(currentNotes) {
      return [note, ...currentNotes];
    });
    return note;
  }

  function updateNoteHtml(noteId: string, html: string) {
    const summary = summarizeNoteHtml(html);
    const updatedAt = Date.now();
    // The editor already shows the typed text; the note list and storage can catch up
    // without delaying the next keystroke.
    startTransition(function saveNoteHtml() {
      updateNote(noteId, function applyHtml(note) {
        return note.html === html ? note : { ...note, ...summary, html, updatedAt };
      });
    });
  }

  function discardNoteIfEmpty(noteId: string) {
    setNotes(function removeEmptyNote(currentNotes) {
      const note = currentNotes.find(function matchesNote(item) {
        return item.id === noteId;
      });
      if (!note || !isNoteEmpty(note)) return currentNotes;
      return currentNotes.filter(function keepOtherNote(item) {
        return item.id !== noteId;
      });
    });
  }

  function togglePinned(noteId: string) {
    updateNote(noteId, function togglePin(note) {
      return { ...note, pinned: !note.pinned };
    });
  }

  function moveNote(noteId: string, folderId: string) {
    updateNote(noteId, function changeFolder(note) {
      return { ...note, folderId, deletedAt: null };
    });
  }

  function deleteNote(noteId: string) {
    const deletedAt = Date.now();
    setNotes(function removeNote(currentNotes) {
      return currentNotes.flatMap(function deleteMatchingNote(note) {
        if (note.id !== noteId) return [note];
        if (note.deletedAt !== null || isNoteEmpty(note)) return [];
        return [{ ...note, deletedAt, pinned: false }];
      });
    });
  }

  function recoverNote(noteId: string) {
    const folderIds = new Set(
      folders.map(function selectId(folder) {
        return folder.id;
      }),
    );
    updateNote(noteId, function restoreNote(note) {
      return {
        ...note,
        deletedAt: null,
        folderId: folderIds.has(note.folderId) ? note.folderId : defaultFolderId,
      };
    });
  }

  function createFolder(name: string) {
    const folder: NoteFolder = { id: createNoteId(), name, createdAt: Date.now() };
    setFolders(function addFolder(currentFolders) {
      return [...currentFolders, folder];
    });
    return folder;
  }

  function renameFolder(folderId: string, name: string) {
    setFolders(function applyRename(currentFolders) {
      return currentFolders.map(function renameMatchingFolder(folder) {
        return folder.id === folderId ? { ...folder, name } : folder;
      });
    });
  }

  function deleteFolder(folderId: string) {
    const deletedAt = Date.now();
    setFolders(function removeFolder(currentFolders) {
      return currentFolders.filter(function keepOtherFolder(folder) {
        return folder.id !== folderId;
      });
    });
    setNotes(function deleteFolderNotes(currentNotes) {
      return currentNotes.map(function moveToRecentlyDeleted(note) {
        return note.folderId === folderId && note.deletedAt === null
          ? { ...note, deletedAt, pinned: false }
          : note;
      });
    });
  }

  function updatePreferences(update: Partial<NotesPreferences>) {
    const nextPreferences = { ...preferences, ...update };
    setPreferences(nextPreferences);
    writeStoredValue(preferencesStorageKey, JSON.stringify(nextPreferences));
  }

  return {
    createFolder,
    createNote,
    deleteFolder,
    deleteNote,
    discardNoteIfEmpty,
    folders,
    isReady,
    moveNote,
    notes,
    preferences,
    recoverNote,
    renameFolder,
    togglePinned,
    updateNoteHtml,
    updatePreferences,
  };
}

function createNoteRecord(folderId: string, html: string, now: number): Note {
  return {
    id: createNoteId(),
    folderId,
    html,
    ...summarizeNoteHtml(html),
    pinned: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

function readPreferences(): NotesPreferences {
  try {
    const value = readStoredValue(preferencesStorageKey);
    if (!value) return defaultPreferences;
    const stored = JSON.parse(value) as Partial<NotesPreferences>;
    return {
      groupByDate: typeof stored.groupByDate === "boolean" ? stored.groupByDate : true,
      sortOrder:
        stored.sortOrder === "created" || stored.sortOrder === "title"
          ? stored.sortOrder
          : "edited",
      viewMode: stored.viewMode === "gallery" ? "gallery" : "list",
    };
  } catch {
    return defaultPreferences;
  }
}
