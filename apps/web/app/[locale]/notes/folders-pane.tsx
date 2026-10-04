"use client";

import { ComposeIcon } from "@workspace/icons/compose-icon";
import { FolderIcon } from "@workspace/icons/folder-icon";
import { FolderPlusIcon } from "@workspace/icons/folder-plus-icon";
import { PencilIcon } from "@workspace/icons/pencil-icon";
import { SearchIcon } from "@workspace/icons/search-icon";
import { TrashIcon } from "@workspace/icons/trash-icon";
import { cn } from "@workspace/ui/lib/utils";

import type { Note, NoteFolder, NotesMessages } from "./types";

import { IosAppSwitcherButton } from "../../../components/ios/ios-app-switcher-button";
import { IosBarButton } from "../../../components/ios/ios-bar-button";
import { IosContentUnavailable } from "../../../components/ios/ios-content-unavailable";
import { IosListRow } from "../../../components/ios/ios-list-row";
import { IosListSection } from "../../../components/ios/ios-list-section";
import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";
import { IosSearchField } from "../../../components/ios/ios-search-field";
import { IosSwipeActions } from "../../../components/ios/ios-swipe-actions";
import { NoteRow } from "./note-row";
import { NotesToolbar } from "./notes-toolbar";
import { allNotesFolderId, defaultFolderId, recentlyDeletedFolderId } from "./use-notes-store";

interface FoldersPaneProps {
  className?: string;
  deletedCount: number;
  folderCounts: ReadonlyMap<string, number>;
  folderNames: ReadonlyMap<string, string>;
  folders: readonly NoteFolder[];
  locale: string;
  messages: NotesMessages;
  now: number;
  onCreateFolder: () => void;
  onCreateNote: () => void;
  onDeleteFolder: (folder: NoteFolder) => void;
  onDeleteNote: (note: Note) => void;
  onMoveNote: (note: Note) => void;
  onRecoverNote: (note: Note) => void;
  onRenameFolder: (folder: NoteFolder) => void;
  onSearchQueryChange: (query: string) => void;
  onSelectFolder: (folderId: string) => void;
  onSelectNote: (note: Note) => void;
  onTogglePinned: (note: Note) => void;
  searchQuery: string;
  searchResults: readonly Note[];
  selectedFolderId: string | null;
  selectedNoteId: string | null;
  totalCount: number;
}

export function FoldersPane({
  className,
  deletedCount,
  folderCounts,
  folderNames,
  folders,
  locale,
  messages,
  now,
  onCreateFolder,
  onCreateNote,
  onDeleteFolder,
  onDeleteNote,
  onMoveNote,
  onRecoverNote,
  onRenameFolder,
  onSearchQueryChange,
  onSelectFolder,
  onSelectNote,
  onTogglePinned,
  searchQuery,
  searchResults,
  selectedFolderId,
  selectedNoteId,
  totalCount,
}: FoldersPaneProps) {
  const isSearching = searchQuery.trim().length > 0;

  return (
    <section
      aria-label={messages.Folders}
      className={cn(
        "relative min-h-0 flex-col bg-ios-grouped-background md:overflow-hidden md:rounded-ios-2xl md:bg-ios-secondary-background md:shadow-ios-panel",
        className,
      )}
    >
      <div
        data-ios-scroll
        className="flex h-full flex-col overflow-y-auto overscroll-contain pb-28 [--ios-bar-edge:var(--ios-grouped-background)] md:[--ios-bar-edge:var(--ios-secondary-background)]"
      >
        <IosNavigationBar
          title={messages.Folders}
          titleElement="h2"
          leading={<IosAppSwitcherButton />}
        />
        {isSearching ? (
          searchResults.length > 0 ? (
            <IosListSection header={messages.Notes} headerVariant="prominent" className="pt-2">
              {searchResults.map(function renderSearchResult(note) {
                return (
                  <NoteRow
                    key={note.id}
                    note={note}
                    folderName={
                      note.deletedAt === null
                        ? (folderNames.get(note.folderId) ?? messages.Notes)
                        : messages["Recently Deleted"]
                    }
                    locale={locale}
                    messages={messages}
                    now={now}
                    selected={note.id === selectedNoteId}
                    onSelect={onSelectNote}
                    onDelete={onDeleteNote}
                    onMove={onMoveNote}
                    onRecover={onRecoverNote}
                    onTogglePinned={onTogglePinned}
                  />
                );
              })}
            </IosListSection>
          ) : (
            <IosContentUnavailable icon={<SearchIcon />} title={messages["No Results"]} />
          )
        ) : (
          <IosListSection
            header={messages["On This Device"]}
            headerVariant="prominent"
            footer={messages["Your notes are stored only on this device."]}
            className="pt-2 md:px-2.5"
            listClassName={sidebarListClassName}
          >
            {folders.length > 0 ? (
              <IosListRow
                icon={<FolderIcon />}
                label={messages["All Notes"]}
                detail={totalCount}
                selected={selectedFolderId === allNotesFolderId}
                onClick={function selectAllNotes() {
                  onSelectFolder(allNotesFolderId);
                }}
              />
            ) : null}
            <IosListRow
              icon={<FolderIcon />}
              label={messages.Notes}
              detail={folderCounts.get(defaultFolderId) ?? 0}
              selected={selectedFolderId === defaultFolderId}
              onClick={function selectDefaultFolder() {
                onSelectFolder(defaultFolderId);
              }}
            />
            {folders.map(function renderFolder(folder) {
              const isSelected = selectedFolderId === folder.id;
              return (
                <li
                  key={folder.id}
                  className="relative not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-[52px] not-last:after:z-10 not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-ios-separator"
                >
                  <IosSwipeActions
                    className="bg-ios-grouped-cell md:bg-transparent"
                    trailingActions={[
                      {
                        id: "delete",
                        label: messages["Delete Folder"],
                        icon: <TrashIcon />,
                        colorClassName: "bg-ios-red",
                        onSelect: function deleteFolder() {
                          onDeleteFolder(folder);
                        },
                      },
                      {
                        id: "rename",
                        label: messages["Rename Folder"],
                        icon: <PencilIcon />,
                        colorClassName: "bg-ios-gray",
                        onSelect: function renameFolder() {
                          onRenameFolder(folder);
                        },
                      },
                    ]}
                  >
                    <ul className="m-0 list-none p-0">
                      <IosListRow
                        icon={<FolderIcon />}
                        label={folder.name}
                        detail={folderCounts.get(folder.id) ?? 0}
                        selected={isSelected}
                        onClick={function selectFolder() {
                          onSelectFolder(folder.id);
                        }}
                      />
                    </ul>
                  </IosSwipeActions>
                </li>
              );
            })}
            {deletedCount > 0 ? (
              <IosListRow
                icon={<TrashIcon />}
                label={messages["Recently Deleted"]}
                detail={deletedCount}
                selected={selectedFolderId === recentlyDeletedFolderId}
                onClick={function selectRecentlyDeleted() {
                  onSelectFolder(recentlyDeletedFolderId);
                }}
              />
            ) : null}
          </IosListSection>
        )}
      </div>
      <NotesToolbar
        label={messages.Folders}
        className="[--ios-bar-edge:var(--ios-grouped-background)] md:[--ios-bar-edge:var(--ios-secondary-background)]"
      >
        <IosBarButton
          aria-label={messages["New Folder"]}
          className="text-ios-tint"
          onClick={onCreateFolder}
        >
          <FolderPlusIcon />
        </IosBarButton>
        <IosSearchField
          aria-label={messages.Search}
          placeholder={messages.Search}
          cancelLabel={messages.Cancel}
          clearLabel={messages["Clear text"]}
          value={searchQuery}
          containerClassName="min-w-0 flex-1 md:hidden"
          onValueChange={onSearchQueryChange}
        />
        {/* Wide layouts search from the notes list and compose from the editor's toolbar. */}
        <IosBarButton
          aria-label={messages["New Note"]}
          className="text-ios-tint md:hidden"
          onClick={onCreateNote}
        >
          <ComposeIcon />
        </IosBarButton>
      </NotesToolbar>
    </section>
  );
}

// Beside the notes list, folders appear as sidebar rows: no grouped card, separators, or
// chevrons, and the selected folder is a rounded tinted capsule.
const sidebarListClassName =
  "md:flex md:flex-col md:gap-0.5 md:overflow-visible md:rounded-none md:bg-transparent md:[&_button]:min-h-11 md:[&_button]:rounded-ios-md md:[&_button]:py-2.5 md:[&_button>svg:last-child]:hidden md:[&>li]:after:hidden";
