"use client";

import { CameraIcon } from "@workspace/icons/camera-icon";
import { ChecklistIcon } from "@workspace/icons/checklist-icon";
import { ChevronLeftIcon } from "@workspace/icons/chevron-left-icon";
import { ComposeIcon } from "@workspace/icons/compose-icon";
import { EllipsisCircleIcon } from "@workspace/icons/ellipsis-circle-icon";
import { FolderIcon } from "@workspace/icons/folder-icon";
import { KeyboardDismissIcon } from "@workspace/icons/keyboard-dismiss-icon";
import { PinIcon } from "@workspace/icons/pin-icon";
import { ShareUpIcon } from "@workspace/icons/share-up-icon";
import { TextFormatIcon } from "@workspace/icons/text-format-icon";
import { TrashIcon } from "@workspace/icons/trash-icon";
import { UndoIcon } from "@workspace/icons/undo-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useRef, useState, type PointerEvent } from "react";

import type { Note, NotesMessages } from "./types";

import { IosAlert } from "../../components/ios/ios-alert";
import { IosBarButton } from "../../components/ios/ios-bar-button";
import { IosMenu, type IosMenuSection } from "../../components/ios/ios-menu";
import { IosNavigationBar } from "../../components/ios/ios-navigation-bar";
import { copyText } from "../../lib/copy-text";
import { insertImage, startNewLineAtEnd, toggleChecklist, undoEditing } from "./note-commands";
import { formatNoteHeaderDate } from "./note-dates";
import { NoteEditor } from "./note-editor";
import { NoteFormatPanel } from "./note-format-panel";
import { isSafeNoteImageSource, noteHtmlToPlainText } from "./note-html";
import { prepareNoteImage } from "./note-image";
import { NotesToolbar } from "./notes-toolbar";

interface NoteEditorPaneProps {
  focusOnOpen: boolean;
  backLabel: string;
  className?: string;
  locale: string;
  messages: NotesMessages;
  note: Note | null;
  onBack: () => void;
  onCreateNote: () => void;
  onDeleteNote: (note: Note) => void;
  onHtmlChange: (noteId: string, html: string) => void;
  onMoveNote: (note: Note) => void;
  onRecoverNote: (note: Note) => void;
  onTogglePinned: (note: Note) => void;
  backButtonClassName?: string;
}

export function NoteEditorPane({
  focusOnOpen,
  backLabel,
  className,
  locale,
  messages,
  note,
  onBack,
  onCreateNote,
  onDeleteNote,
  onHtmlChange,
  onMoveNote,
  onRecoverNote,
  onTogglePinned,
  backButtonClassName,
}: NoteEditorPaneProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastRangeRef = useRef<Range | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isFormatOpen, setIsFormatOpen] = useState(false);
  const [isReadOnlyAlertOpen, setIsReadOnlyAlertOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const isDeleted = note?.deletedAt !== null && note?.deletedAt !== undefined;

  useEffect(
    function rememberEditorSelection() {
      if (!isEditing) return;
      function storeSelection() {
        const selection = window.getSelection();
        const editor = editorRef.current;
        if (!selection || selection.rangeCount === 0 || !editor) return;
        const range = selection.getRangeAt(0);
        if (editor.contains(range.commonAncestorContainer))
          lastRangeRef.current = range.cloneRange();
      }
      document.addEventListener("selectionchange", storeSelection);
      return function stopRememberingSelection() {
        document.removeEventListener("selectionchange", storeSelection);
      };
    },
    [isEditing],
  );

  useEffect(
    function clearStatusMessage() {
      if (!statusMessage) return;
      const timeout = window.setTimeout(function hideStatusMessage() {
        setStatusMessage("");
      }, 1_600);
      return function cancelStatusMessage() {
        window.clearTimeout(timeout);
      };
    },
    [statusMessage],
  );

  function focusEditorAtSelection() {
    const editor = editorRef.current;
    if (!editor) return null;
    if (document.activeElement !== editor) editor.focus({ preventScroll: true });
    const range = lastRangeRef.current;
    if (range && editor.contains(range.commonAncestorContainer)) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    } else {
      startNewLineAtEnd(editor);
    }
    return editor;
  }

  function addChecklist() {
    if (isDeleted) {
      setIsReadOnlyAlertOpen(true);
      return;
    }
    const editor = focusEditorAtSelection();
    if (editor) toggleChecklist(editor);
  }

  async function insertPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const preparedSources = await Promise.all(Array.from(files, prepareNoteImage));
    const sources = preparedSources.filter(function isSafeSource(source): source is string {
      return source !== null && isSafeNoteImageSource(source);
    });
    if (sources.length === 0 || !focusEditorAtSelection()) return;
    for (const source of sources) insertImage(source);
  }

  async function shareNote() {
    if (!note) return;
    const text = noteHtmlToPlainText(note.html);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: note.title, text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    if (await copyText(text)) setStatusMessage(messages["Copied to Clipboard"]);
  }

  const menuSections: IosMenuSection[] = !note
    ? []
    : isDeleted
      ? [
          {
            id: "deleted",
            actions: [
              {
                id: "recover",
                label: messages.Recover,
                icon: <FolderIcon />,
                onSelect: function recoverNote() {
                  onRecoverNote(note);
                },
              },
              {
                id: "delete",
                label: messages.Delete,
                icon: <TrashIcon />,
                destructive: true,
                onSelect: function deleteNote() {
                  onDeleteNote(note);
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
                  onMoveNote(note);
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
                  onDeleteNote(note);
                },
              },
            ],
          },
        ];

  const photoMenuSections: IosMenuSection[] = [
    {
      id: "photos",
      actions: [
        {
          id: "choose",
          label: messages["Choose Photo"],
          onSelect: function choosePhoto() {
            photoInputRef.current?.click();
          },
        },
        {
          id: "take",
          label: messages["Take Photo"],
          icon: <CameraIcon />,
          onSelect: function takePhoto() {
            cameraInputRef.current?.click();
          },
        },
      ],
    },
  ];

  return (
    <section
      aria-label={note?.title || messages["New Note"]}
      className={cn("relative min-h-0 flex-col bg-(--ios-background)", className)}
    >
      <div data-ios-scroll className="flex h-full flex-col overflow-y-auto overscroll-contain">
        <IosNavigationBar
          title={note ? note.title || messages["New Note"] : messages.Notes}
          titleDisplay="hidden"
          className="bg-(--ios-background)/0"
          leading={
            <IosBarButton
              className={cn("-ml-1 gap-0.5 px-1", backButtonClassName)}
              onClick={onBack}
            >
              <ChevronLeftIcon className="!size-[24px]" strokeWidth={2.6} />
              <span className="truncate">{backLabel}</span>
            </IosBarButton>
          }
          trailing={
            note ? (
              <>
                {isEditing ? (
                  <IosBarButton
                    aria-label={messages.Undo}
                    onPointerDown={keepEditorFocus}
                    onClick={undoEditing}
                  >
                    <UndoIcon />
                  </IosBarButton>
                ) : null}
                <IosBarButton
                  aria-label={messages["Share Note"]}
                  onClick={function share() {
                    void shareNote();
                  }}
                >
                  <ShareUpIcon />
                </IosBarButton>
                <IosMenu
                  sections={menuSections}
                  trigger={
                    <IosBarButton aria-label={messages.More}>
                      <EllipsisCircleIcon />
                    </IosBarButton>
                  }
                />
                {isEditing ? (
                  <IosBarButton
                    className="font-semibold"
                    onClick={function finishEditing() {
                      editorRef.current?.blur();
                      setIsFormatOpen(false);
                    }}
                  >
                    {messages.Done}
                  </IosBarButton>
                ) : null}
              </>
            ) : null
          }
        />
        {note ? (
          <>
            <Text className="shrink-0 pt-1 pb-3 text-center text-[13px] leading-[18px] text-(--ios-secondary-label)">
              {formatNoteHeaderDate(note.updatedAt, locale)}
            </Text>
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
              <NoteEditor
                key={note.id}
                focusOnOpen={focusOnOpen}
                editorRef={editorRef}
                html={note.html}
                label={messages["Note text"]}
                noteId={note.id}
                readOnly={isDeleted}
                onEditingChange={function updateEditing(nextIsEditing) {
                  setIsEditing(nextIsEditing);
                }}
                onHtmlChange={onHtmlChange}
                onReadOnlyInteraction={function explainReadOnly() {
                  setIsReadOnlyAlertOpen(true);
                }}
              />
            </div>
          </>
        ) : (
          <Text className="m-auto px-6 pb-24 text-center text-[17px] text-(--ios-tertiary-label)">
            {messages["No Note Selected"]}
          </Text>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 z-20 flex translate-y-[calc(-1*var(--keyboard-inset,0px))] flex-col">
        {isFormatOpen && isEditing ? (
          <NoteFormatPanel
            editorRef={editorRef}
            messages={messages}
            onClose={function closeFormat() {
              setIsFormatOpen(false);
            }}
          />
        ) : null}
      </div>
      <NotesToolbar
        label={messages.Format}
        className={cn(isFormatOpen && isEditing && "pointer-events-none opacity-0")}
      >
        {note && !isDeleted ? (
          isEditing ? (
            <>
              <IosBarButton
                aria-label={messages.Format}
                aria-pressed={isFormatOpen}
                onPointerDown={keepEditorFocus}
                onClick={function toggleFormat() {
                  setIsFormatOpen(!isFormatOpen);
                }}
              >
                <TextFormatIcon />
              </IosBarButton>
              <IosBarButton
                aria-label={messages.Checklist}
                onPointerDown={keepEditorFocus}
                onClick={addChecklist}
              >
                <ChecklistIcon />
              </IosBarButton>
              <IosMenu
                side="top"
                align="center"
                sections={photoMenuSections}
                trigger={
                  <IosBarButton aria-label={messages["Attach Photo"]}>
                    <CameraIcon />
                  </IosBarButton>
                }
              />
              <IosBarButton
                aria-label={messages["Hide Keyboard"]}
                onClick={function hideKeyboard() {
                  editorRef.current?.blur();
                }}
              >
                <KeyboardDismissIcon />
              </IosBarButton>
            </>
          ) : (
            <>
              <IosBarButton aria-label={messages.Checklist} onClick={addChecklist}>
                <ChecklistIcon />
              </IosBarButton>
              <IosMenu
                side="top"
                align="center"
                sections={photoMenuSections}
                trigger={
                  <IosBarButton aria-label={messages["Attach Photo"]}>
                    <CameraIcon />
                  </IosBarButton>
                }
              />
              <span className="flex-1" />
              <IosBarButton aria-label={messages["New Note"]} onClick={onCreateNote}>
                <ComposeIcon />
              </IosBarButton>
            </>
          )
        ) : (
          <>
            <span className="flex-1" />
            <IosBarButton aria-label={messages["New Note"]} onClick={onCreateNote}>
              <ComposeIcon />
            </IosBarButton>
          </>
        )}
      </NotesToolbar>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={function choosePhotos(event) {
          const input = event.currentTarget;
          void insertPhotos(input.files).finally(function resetInput() {
            input.value = "";
          });
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={function capturePhoto(event) {
          const input = event.currentTarget;
          void insertPhotos(input.files).finally(function resetInput() {
            input.value = "";
          });
        }}
      />
      <div
        aria-live="polite"
        className={cn(
          "pointer-events-none absolute top-1/3 left-1/2 z-30 -translate-x-1/2 rounded-[14px] bg-(--ios-menu) px-5 py-3 text-[15px] font-semibold text-(--ios-label) shadow-[0_10px_40px_rgb(0_0_0/0.18)] backdrop-blur-2xl transition-opacity duration-200 motion-reduce:transition-none",
          statusMessage ? "opacity-100" : "opacity-0",
        )}
      >
        {statusMessage}
      </div>
      {note ? (
        <IosAlert
          open={isReadOnlyAlertOpen}
          onOpenChange={setIsReadOnlyAlertOpen}
          title={messages["Recently Deleted"]}
          message={
            messages["Recently deleted notes can’t be edited. Recover this note to edit it."]
          }
          actions={[
            {
              label: messages.Cancel,
              role: "cancel",
              onSelect: function dismissAlert() {
                setIsReadOnlyAlertOpen(false);
              },
            },
            {
              label: messages.Recover,
              role: "default",
              preferred: true,
              onSelect: function recoverFromAlert() {
                setIsReadOnlyAlertOpen(false);
                onRecoverNote(note);
              },
            },
          ]}
        />
      ) : null}
    </section>
  );
}

function keepEditorFocus(event: PointerEvent<HTMLElement>) {
  event.preventDefault();
}
