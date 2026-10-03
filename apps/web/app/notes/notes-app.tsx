"use client";

import { cn } from "@workspace/ui/lib/utils";
import { lazy, Suspense, useDeferredValue, useEffect, useRef, useState } from "react";

import type { Note, NoteFolder, NotesMessages } from "./types";

import { IosAlert } from "../../components/ios/ios-alert";
import { IosScreenTransition } from "../../components/ios/ios-screen-transition";
import { useHasOpened } from "../../components/use-has-opened";
import { FoldersPane } from "./folders-pane";
import { groupNotes, sortNotes } from "./note-dates";
import { NoteEditorPane } from "./note-editor-pane";
import { NotesListPane } from "./notes-list-pane";
import { NotesSkeleton } from "./notes-skeleton";
import { useKeyboardInset } from "./use-keyboard-inset";
import { useNotesRoute } from "./use-notes-route";
import {
  allNotesFolderId,
  defaultFolderId,
  recentlyDeletedFolderId,
  useNotesStore,
} from "./use-notes-store";

interface NotesAppProps {
  locale: string;
  messages: NotesMessages;
  welcomeNoteHtml: string;
}

interface FolderNameDialog {
  folderId: string | null;
  name: string;
}

const minuteMilliseconds = 60_000;
const NoteMoveSheet = lazy(function importNoteMoveSheet() {
  return import("./note-move-sheet").then(function selectNoteMoveSheet(module) {
    return { default: module.NoteMoveSheet };
  });
});

export function NotesApp({ locale, messages, welcomeNoteHtml }: NotesAppProps) {
  const store = useNotesStore({ welcomeNoteHtml });
  const { goBack, navigate, route } = useNotesRoute();
  const rootRef = useRef<HTMLDivElement>(null);
  const keyboardWarmupRef = useRef<HTMLInputElement>(null);
  const previousNoteIdRef = useRef<string | null>(null);
  const [now, setNow] = useState(function readCurrentTime() {
    return Date.now();
  });
  const [folderSearchQuery, setFolderSearchQuery] = useState("");
  const [listSearchQuery, setListSearchQuery] = useState("");
  const deferredFolderSearchQuery = useDeferredValue(folderSearchQuery);
  const deferredListSearchQuery = useDeferredValue(listSearchQuery);
  const [autoFocusNoteId, setAutoFocusNoteId] = useState<string | null>(null);
  const [folderNameDialog, setFolderNameDialog] = useState<FolderNameDialog | null>(null);
  const [isNameTakenOpen, setIsNameTakenOpen] = useState(false);
  const [folderPendingDeletion, setFolderPendingDeletion] = useState<NoteFolder | null>(null);
  const [noteIdToMove, setNoteIdToMove] = useState<string | null>(null);
  useKeyboardInset(rootRef);

  useEffect(function refreshRelativeDates() {
    const interval = window.setInterval(function updateCurrentTime() {
      setNow(Date.now());
    }, minuteMilliseconds);
    return function stopRefreshingRelativeDates() {
      window.clearInterval(interval);
    };
  }, []);

  const userFolders = store.folders.toSorted(function compareFolders(first, second) {
    return first.name.localeCompare(second.name, locale, { numeric: true, sensitivity: "base" });
  });
  const folderNames = new Map<string, string>([
    [defaultFolderId, messages.Notes],
    ...userFolders.map(function createFolderName(folder): [string, string] {
      return [folder.id, folder.name];
    }),
  ]);
  const notesById = new Map(
    store.notes.map(function indexNote(note) {
      return [note.id, note];
    }),
  );
  const activeNotes = store.notes.filter(function isActive(note) {
    return note.deletedAt === null;
  });
  const deletedNotes = store.notes.filter(function isDeleted(note) {
    return note.deletedAt !== null;
  });
  const folderCounts = new Map<string, number>();
  for (const note of activeNotes) {
    folderCounts.set(note.folderId, (folderCounts.get(note.folderId) ?? 0) + 1);
  }

  const routeFolderId =
    route.folderId &&
    (folderNames.has(route.folderId) ||
      route.folderId === allNotesFolderId ||
      route.folderId === recentlyDeletedFolderId)
      ? route.folderId
      : null;
  const listFolderId = routeFolderId ?? defaultFolderId;
  const selectedNote = route.noteId ? (notesById.get(route.noteId) ?? null) : null;
  const isRecentlyDeleted = listFolderId === recentlyDeletedFolderId;
  const isAllNotes = listFolderId === allNotesFolderId;
  const listTitle = isRecentlyDeleted
    ? messages["Recently Deleted"]
    : isAllNotes
      ? messages["All Notes"]
      : (folderNames.get(listFolderId) ?? messages.Notes);
  const folderNotes = isRecentlyDeleted
    ? deletedNotes
    : isAllNotes
      ? activeNotes
      : activeNotes.filter(function isInFolder(note) {
          return note.folderId === listFolderId;
        });
  const listNotes = filterNotes(folderNotes, deferredListSearchQuery, locale);
  const listSections = groupNotes(sortNotes(listNotes, store.preferences.sortOrder, locale), {
    groupByDate: store.preferences.groupByDate,
    labels: {
      pinned: messages.Pinned,
      previous7Days: messages["Previous 7 Days"],
      previous30Days: messages["Previous 30 Days"],
    },
    locale,
    now,
    sortOrder: store.preferences.sortOrder,
  });
  const searchResults = deferredFolderSearchQuery.trim()
    ? sortNotes(filterNotes(store.notes, deferredFolderSearchQuery, locale), "edited", locale)
    : [];
  const noteToMove = noteIdToMove ? (notesById.get(noteIdToMove) ?? null) : null;
  const hasMoveSheetOpened = useHasOpened(noteToMove !== null);
  const moveDestinations: NoteFolder[] = [
    { id: defaultFolderId, name: messages.Notes, createdAt: 0 },
    ...userFolders,
  ];

  useEffect(
    function discardEmptyNoteAfterLeaving() {
      const previousNoteId = previousNoteIdRef.current;
      previousNoteIdRef.current = route.noteId;
      if (!previousNoteId || previousNoteId === route.noteId) return;
      // The editor saves pending typing while it unmounts; check emptiness after that update.
      window.setTimeout(function discardPreviousNote() {
        store.discardNoteIfEmpty(previousNoteId);
      }, 0);
    },
    // oxlint-disable-next-line react/exhaustive-deps -- Only react to the open note changing.
    [route.noteId],
  );

  function selectFolder(folderId: string) {
    setListSearchQuery("");
    navigate(
      { folderId, noteId: null },
      { history: route.folderId !== null || route.noteId !== null ? "replace" : "push" },
    );
  }

  function openNote(note: Note, folderId: string) {
    const isSwitchingNotes = route.noteId !== null;
    navigate(
      { folderId, noteId: note.id },
      {
        direction: isSwitchingNotes ? "none" : "forward",
        history: isSwitchingNotes ? "replace" : "push",
      },
    );
  }

  function selectListNote(note: Note) {
    setAutoFocusNoteId(null);
    openNote(note, listFolderId);
  }

  function selectSearchResult(note: Note) {
    setAutoFocusNoteId(null);
    openNote(note, note.deletedAt === null ? note.folderId : recentlyDeletedFolderId);
  }

  function createNote(folderId: string) {
    const targetFolderId = folderNames.has(folderId) ? folderId : defaultFolderId;
    // Focusing synchronously keeps the software keyboard open while the new note animates in.
    keyboardWarmupRef.current?.focus({ preventScroll: true });
    const note = store.createNote(targetFolderId);
    setAutoFocusNoteId(note.id);
    setListSearchQuery("");
    openNote(
      note,
      routeFolderId && folderNames.has(routeFolderId) ? routeFolderId : targetFolderId,
    );
  }

  function deleteNote(note: Note) {
    store.deleteNote(note.id);
    if (note.id === route.noteId) {
      goBack({ folderId: routeFolderId ?? defaultFolderId, noteId: null });
    }
  }

  function submitFolderName() {
    if (!folderNameDialog) return;
    const name = folderNameDialog.name.trim().slice(0, 80);
    if (!name) return;
    const normalizedName = name.toLocaleLowerCase(locale);
    const isTaken = Array.from(folderNames.entries()).some(function matchesName([
      folderId,
      folderName,
    ]) {
      return (
        folderId !== folderNameDialog.folderId &&
        folderName.toLocaleLowerCase(locale) === normalizedName
      );
    });
    if (isTaken) {
      setIsNameTakenOpen(true);
      return;
    }
    if (folderNameDialog.folderId) store.renameFolder(folderNameDialog.folderId, name);
    else store.createFolder(name);
    setFolderNameDialog(null);
  }

  function confirmFolderDeletion() {
    if (!folderPendingDeletion) return;
    store.deleteFolder(folderPendingDeletion.id);
    if (routeFolderId === folderPendingDeletion.id) {
      navigate({ folderId: null, noteId: null }, { direction: "back", history: "replace" });
    }
    setFolderPendingDeletion(null);
  }

  const currentUserFolder = userFolders.find(function isCurrentFolder(folder) {
    return folder.id === listFolderId;
  });

  return (
    <div ref={rootRef} className="flex size-full min-w-0">
      <h1 className="sr-only">{messages.Notes}</h1>
      <input
        ref={keyboardWarmupRef}
        aria-hidden="true"
        tabIndex={-1}
        className="pointer-events-none fixed top-0 left-0 size-px opacity-0"
      />
      {store.isReady ? (
        <>
          <IosScreenTransition>
            <FoldersPane
              className={cn(
                !route.folderId && !route.noteId ? "flex" : "hidden",
                route.folderId ? "md:hidden lg:flex" : "md:flex",
                "w-full md:w-[320px] md:shrink-0 md:border-r-[0.5px] md:border-(--ios-separator) lg:w-[280px]",
              )}
              deletedCount={deletedNotes.length}
              folderCounts={folderCounts}
              folderNames={folderNames}
              folders={userFolders}
              locale={locale}
              messages={messages}
              now={now}
              searchQuery={folderSearchQuery}
              searchResults={searchResults}
              selectedFolderId={routeFolderId}
              selectedNoteId={route.noteId}
              totalCount={activeNotes.length}
              onCreateFolder={function openNewFolderDialog() {
                setFolderNameDialog({ folderId: null, name: "" });
              }}
              onCreateNote={function createNoteFromFolders() {
                createNote(defaultFolderId);
              }}
              onDeleteFolder={setFolderPendingDeletion}
              onDeleteNote={deleteNote}
              onMoveNote={function chooseFolder(note) {
                setNoteIdToMove(note.id);
              }}
              onRecoverNote={function recover(note) {
                store.recoverNote(note.id);
              }}
              onRenameFolder={function openRenameDialog(folder) {
                setFolderNameDialog({ folderId: folder.id, name: folder.name });
              }}
              onSearchQueryChange={setFolderSearchQuery}
              onSelectFolder={selectFolder}
              onSelectNote={selectSearchResult}
              onTogglePinned={function togglePinned(note) {
                store.togglePinned(note.id);
              }}
            />
          </IosScreenTransition>
          <IosScreenTransition>
            <NotesListPane
              className={cn(
                route.folderId && !route.noteId ? "flex" : "hidden",
                route.folderId ? "md:flex" : "md:hidden lg:flex",
                "w-full md:w-[320px] md:shrink-0 md:border-r-[0.5px] md:border-(--ios-separator)",
              )}
              backButtonClassName="lg:hidden"
              backLabel={messages.Folders}
              canManageFolder={Boolean(currentUserFolder)}
              folderNames={isAllNotes ? folderNames : null}
              isRecentlyDeleted={isRecentlyDeleted}
              locale={locale}
              messages={messages}
              noteCount={folderNotes.length}
              now={now}
              preferences={store.preferences}
              searchQuery={listSearchQuery}
              sections={listSections}
              selectedNoteId={route.noteId}
              title={listTitle}
              onBack={function showFolders() {
                goBack({ folderId: null, noteId: null });
              }}
              onCreateNote={function createNoteInFolder() {
                createNote(listFolderId);
              }}
              onDeleteFolder={function confirmDeleteFolder() {
                if (currentUserFolder) setFolderPendingDeletion(currentUserFolder);
              }}
              onDeleteNote={deleteNote}
              onMoveNote={function chooseFolder(note) {
                setNoteIdToMove(note.id);
              }}
              onPreferencesChange={store.updatePreferences}
              onRecoverNote={function recover(note) {
                store.recoverNote(note.id);
              }}
              onRenameFolder={function openRenameDialog() {
                if (currentUserFolder) {
                  setFolderNameDialog({
                    folderId: currentUserFolder.id,
                    name: currentUserFolder.name,
                  });
                }
              }}
              onSearchQueryChange={setListSearchQuery}
              onSelectNote={selectListNote}
              onTogglePinned={function togglePinned(note) {
                store.togglePinned(note.id);
              }}
            />
          </IosScreenTransition>
          <IosScreenTransition>
            <NoteEditorPane
              className={cn(route.noteId ? "flex" : "hidden", "min-w-0 flex-1 md:flex")}
              focusOnOpen={selectedNote?.id === autoFocusNoteId}
              backButtonClassName="md:hidden"
              backLabel={listTitle}
              locale={locale}
              messages={messages}
              note={selectedNote}
              onBack={function showList() {
                goBack({ folderId: listFolderId, noteId: null });
              }}
              onCreateNote={function createNoteFromEditor() {
                createNote(selectedNote?.folderId ?? listFolderId);
              }}
              onDeleteNote={deleteNote}
              onHtmlChange={store.updateNoteHtml}
              onMoveNote={function chooseFolder(note) {
                setNoteIdToMove(note.id);
              }}
              onRecoverNote={function recover(note) {
                store.recoverNote(note.id);
              }}
              onTogglePinned={function togglePinned(note) {
                store.togglePinned(note.id);
              }}
            />
          </IosScreenTransition>
        </>
      ) : (
        <NotesSkeleton />
      )}
      <IosAlert
        open={folderNameDialog !== null}
        onOpenChange={function closeFolderDialog(open) {
          if (!open) setFolderNameDialog(null);
        }}
        title={folderNameDialog?.folderId ? messages["Rename Folder"] : messages["New Folder"]}
        message={messages["Enter a name for this folder."]}
        textField={{
          label: messages.Name,
          placeholder: messages.Name,
          value: folderNameDialog?.name ?? "",
          onValueChange: function updateFolderName(name) {
            setFolderNameDialog(function applyName(dialog) {
              return dialog ? { ...dialog, name } : dialog;
            });
          },
        }}
        actions={[
          {
            label: messages.Cancel,
            role: "cancel",
            onSelect: function cancelFolderDialog() {
              setFolderNameDialog(null);
            },
          },
          {
            label: messages.Save,
            role: "default",
            preferred: true,
            disabled: !folderNameDialog?.name.trim(),
            onSelect: submitFolderName,
          },
        ]}
      />
      <IosAlert
        open={isNameTakenOpen}
        onOpenChange={setIsNameTakenOpen}
        title={messages["Name Taken"]}
        message={messages["Please choose a different name."]}
        actions={[
          {
            label: messages.OK,
            role: "default",
            preferred: true,
            onSelect: function dismissNameTaken() {
              setIsNameTakenOpen(false);
            },
          },
        ]}
      />
      <IosAlert
        open={folderPendingDeletion !== null}
        onOpenChange={function closeDeleteDialog(open) {
          if (!open) setFolderPendingDeletion(null);
        }}
        title={messages["Delete Folder?"]}
        message={messages["All notes in this folder will be moved to Recently Deleted."]}
        actions={[
          {
            label: messages.Cancel,
            role: "cancel",
            onSelect: function cancelFolderDeletion() {
              setFolderPendingDeletion(null);
            },
          },
          {
            label: messages.Delete,
            role: "destructive",
            onSelect: confirmFolderDeletion,
          },
        ]}
      />
      {hasMoveSheetOpened ? (
        <Suspense fallback={null}>
          <NoteMoveSheet
            open={noteToMove !== null}
            onOpenChange={function closeMoveSheet(open) {
              if (!open) setNoteIdToMove(null);
            }}
            currentFolderId={
              noteToMove && noteToMove.deletedAt === null ? noteToMove.folderId : null
            }
            folders={moveDestinations}
            messages={messages}
            onMove={function moveSelectedNote(folderId) {
              if (noteToMove) store.moveNote(noteToMove.id, folderId);
              setNoteIdToMove(null);
            }}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

function filterNotes(notes: readonly Note[], query: string, locale: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  if (!normalizedQuery) return notes;
  return notes.filter(function matchesQuery(note) {
    return (
      note.title.toLocaleLowerCase(locale).includes(normalizedQuery) ||
      note.preview.toLocaleLowerCase(locale).includes(normalizedQuery)
    );
  });
}
