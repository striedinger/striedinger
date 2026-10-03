"use client";

import { ArrowUpDownIcon } from "@workspace/icons/arrow-up-down-icon";
import { CalendarIcon } from "@workspace/icons/calendar-icon";
import { ChevronLeftIcon } from "@workspace/icons/chevron-left-icon";
import { ComposeIcon } from "@workspace/icons/compose-icon";
import { EllipsisIcon } from "@workspace/icons/ellipsis-icon";
import { ListIcon } from "@workspace/icons/list-icon";
import { PencilIcon } from "@workspace/icons/pencil-icon";
import { SearchIcon } from "@workspace/icons/search-icon";
import { SquareGridIcon } from "@workspace/icons/square-grid-icon";
import { TrashIcon } from "@workspace/icons/trash-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

import type { NoteSection } from "./note-dates";
import type { Note, NotesMessages, NotesPreferences } from "./types";

import { IosBarButton } from "../../components/ios/ios-bar-button";
import { IosContentUnavailable } from "../../components/ios/ios-content-unavailable";
import { IosListSection } from "../../components/ios/ios-list-section";
import { IosMenu, type IosMenuSection } from "../../components/ios/ios-menu";
import { IosNavigationBar } from "../../components/ios/ios-navigation-bar";
import { IosSearchField } from "../../components/ios/ios-search-field";
import { NoteGalleryCard } from "./note-gallery-card";
import { NoteRow } from "./note-row";
import { NotesToolbar } from "./notes-toolbar";

interface NotesListPaneProps {
  backLabel: string;
  canManageFolder: boolean;
  className?: string;
  folderNames: ReadonlyMap<string, string> | null;
  isRecentlyDeleted: boolean;
  locale: string;
  messages: NotesMessages;
  noteCount: number;
  now: number;
  onBack: () => void;
  onCreateNote: () => void;
  onDeleteFolder: () => void;
  onDeleteNote: (note: Note) => void;
  onMoveNote: (note: Note) => void;
  onPreferencesChange: (preferences: Partial<NotesPreferences>) => void;
  onRecoverNote: (note: Note) => void;
  onRenameFolder: () => void;
  onSearchQueryChange: (query: string) => void;
  onSelectNote: (note: Note) => void;
  onTogglePinned: (note: Note) => void;
  preferences: NotesPreferences;
  searchQuery: string;
  sections: readonly NoteSection[];
  selectedNoteId: string | null;
  backButtonClassName?: string;
  title: string;
}

export function NotesListPane({
  backLabel,
  canManageFolder,
  className,
  folderNames,
  isRecentlyDeleted,
  locale,
  messages,
  noteCount,
  now,
  onBack,
  onCreateNote,
  onDeleteFolder,
  onDeleteNote,
  onMoveNote,
  onPreferencesChange,
  onRecoverNote,
  onRenameFolder,
  onSearchQueryChange,
  onSelectNote,
  onTogglePinned,
  preferences,
  searchQuery,
  sections,
  selectedNoteId,
  backButtonClassName,
  title,
}: NotesListPaneProps) {
  const isGallery = preferences.viewMode === "gallery";
  const countLabel =
    noteCount === 1
      ? messages["1 Note"]
      : messages["{count} Notes"].replace("{count}", String(noteCount));
  const menuSections: IosMenuSection[] = [
    {
      id: "view",
      actions: [
        {
          id: "view-mode",
          label: isGallery ? messages["View as List"] : messages["View as Gallery"],
          icon: isGallery ? <ListIcon /> : <SquareGridIcon />,
          onSelect: function toggleViewMode() {
            onPreferencesChange({ viewMode: isGallery ? "list" : "gallery" });
          },
        },
      ],
    },
    {
      id: "sort",
      title: messages["Sort By"],
      actions: (
        [
          ["edited", messages["Date Edited"]],
          ["created", messages["Date Created"]],
          ["title", messages.Title],
        ] as const
      ).map(function createSortAction([sortOrder, label]) {
        return {
          id: `sort-${sortOrder}`,
          label,
          checked: preferences.sortOrder === sortOrder,
          icon: sortOrder === "edited" ? <ArrowUpDownIcon /> : undefined,
          onSelect: function selectSortOrder() {
            onPreferencesChange({ sortOrder });
          },
        };
      }),
    },
    {
      id: "group",
      actions: [
        {
          id: "group-by-date",
          label: messages["Group By Date"],
          checked: preferences.groupByDate,
          icon: <CalendarIcon />,
          onSelect: function toggleGrouping() {
            onPreferencesChange({ groupByDate: !preferences.groupByDate });
          },
        },
      ],
    },
    {
      id: "folder",
      actions: canManageFolder
        ? [
            {
              id: "rename-folder",
              label: messages["Rename Folder"],
              icon: <PencilIcon />,
              onSelect: onRenameFolder,
            },
            {
              id: "delete-folder",
              label: messages["Delete Folder"],
              icon: <TrashIcon />,
              destructive: true,
              onSelect: onDeleteFolder,
            },
          ]
        : [],
    },
  ];

  return (
    <section
      aria-label={title}
      className={cn("relative min-h-0 flex-col bg-(--ios-grouped-background)", className)}
    >
      <div
        data-ios-scroll
        className="flex h-full flex-col overflow-y-auto overscroll-contain pb-28 [--ios-bar-edge:var(--ios-grouped-background)]"
      >
        <IosNavigationBar
          title={title}
          subtitle={countLabel}
          leading={
            <IosBarButton
              aria-label={`${messages.Back}: ${backLabel}`}
              className={backButtonClassName}
              onClick={onBack}
            >
              <ChevronLeftIcon strokeWidth={2.6} />
            </IosBarButton>
          }
          trailing={
            <IosMenu
              sections={menuSections}
              trigger={
                <IosBarButton aria-label={messages.More}>
                  <EllipsisIcon />
                </IosBarButton>
              }
            />
          }
        />
        {isRecentlyDeleted && noteCount > 0 ? (
          <Text className="px-8 pb-2 text-center text-[13px] leading-[18px] text-(--ios-secondary-label)">
            {messages["Notes are permanently deleted after 30 days."]}
          </Text>
        ) : null}
        {sections.length === 0 ? (
          <IosContentUnavailable
            icon={searchQuery.trim() ? <SearchIcon /> : <ComposeIcon />}
            title={searchQuery.trim() ? messages["No Results"] : messages["No Notes"]}
          />
        ) : (
          <div className="flex flex-col gap-4 pt-1">
            {sections.map(function renderSection(section) {
              return isGallery ? (
                <section
                  key={section.id}
                  aria-label={section.title || title}
                  className="flex flex-col px-4"
                >
                  {section.title ? (
                    <Text
                      as="h2"
                      className="px-1 pb-2 text-[22px] leading-7 font-bold tracking-[0.35px] text-(--ios-label)"
                    >
                      {section.title}
                    </Text>
                  ) : null}
                  <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-x-3 gap-y-4 p-0">
                    {section.notes.map(function renderGalleryNote(note) {
                      return (
                        <NoteGalleryCard
                          key={note.id}
                          note={note}
                          locale={locale}
                          messages={messages}
                          now={now}
                          selected={note.id === selectedNoteId}
                          onSelect={onSelectNote}
                        />
                      );
                    })}
                  </ul>
                </section>
              ) : (
                <IosListSection
                  key={section.id}
                  label={section.title || title}
                  header={section.title || undefined}
                  headerVariant="prominent"
                >
                  {section.notes.map(function renderNote(note) {
                    return (
                      <NoteRow
                        key={note.id}
                        note={note}
                        folderName={
                          folderNames ? (folderNames.get(note.folderId) ?? messages.Notes) : null
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
              );
            })}
          </div>
        )}
      </div>
      <NotesToolbar label={title} className="[--ios-bar-edge:var(--ios-grouped-background)]">
        <IosSearchField
          aria-label={messages.Search}
          placeholder={messages.Search}
          cancelLabel={messages.Cancel}
          clearLabel={messages["Clear text"]}
          value={searchQuery}
          containerClassName="min-w-0 flex-1"
          onValueChange={onSearchQueryChange}
        />
        {isRecentlyDeleted ? null : (
          <IosBarButton
            aria-label={messages["New Note"]}
            className="text-(--ios-tint)"
            onClick={onCreateNote}
          >
            <ComposeIcon />
          </IosBarButton>
        )}
      </NotesToolbar>
    </section>
  );
}
