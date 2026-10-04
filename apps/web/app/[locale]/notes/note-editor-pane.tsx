"use client";

import { CameraIcon } from "@workspace/icons/camera-icon";
import { CheckIcon } from "@workspace/icons/check-icon";
import { ChevronLeftIcon } from "@workspace/icons/chevron-left-icon";
import { ComposeIcon } from "@workspace/icons/compose-icon";
import { EllipsisIcon } from "@workspace/icons/ellipsis-icon";
import { FolderIcon } from "@workspace/icons/folder-icon";
import { KeyboardDismissIcon } from "@workspace/icons/keyboard-dismiss-icon";
import { PinIcon } from "@workspace/icons/pin-icon";
import { ShareUpIcon } from "@workspace/icons/share-up-icon";
import { TrashIcon } from "@workspace/icons/trash-icon";
import { UndoIcon } from "@workspace/icons/undo-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";

import type { Note, NotesMessages } from "./types";

import { IosAlert } from "../../../components/ios/ios-alert";
import { IosBarButton } from "../../../components/ios/ios-bar-button";
import { IosGlassGroup } from "../../../components/ios/ios-glass-group";
import { IosMenu, type IosMenuSection } from "../../../components/ios/ios-menu";
import { IosNavigationBar } from "../../../components/ios/ios-navigation-bar";
import { IosToast } from "../../../components/ios/ios-toast";
import { copyText } from "../../../lib/copy-text";
import { insertImage, startNewLineAtEnd, toggleChecklist, undoEditing } from "./note-commands";
import { formatNoteHeaderDate } from "./note-dates";
import { NoteEditor } from "./note-editor";
import { NoteFormatControls } from "./note-format-controls";
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
  const editingControlPressedAtRef = useRef(Number.NEGATIVE_INFINITY);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isFormatOpen, setIsFormatOpen] = useState(false);
  const [isReadOnlyAlertOpen, setIsReadOnlyAlertOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const isDeleted = note?.deletedAt !== null && note?.deletedAt !== undefined;

  // The last selection inside the note survives taps on toolbars and menus, which can move
  // focus or collapse the selection on touch devices, so commands still apply to it.
  useEffect(function rememberEditorSelection() {
    function storeSelection() {
      const selection = window.getSelection();
      const editor = editorRef.current;
      if (!selection || selection.rangeCount === 0 || !editor) return;
      const range = selection.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) lastRangeRef.current = range.cloneRange();
    }
    document.addEventListener("selectionchange", storeSelection);
    return function stopRememberingSelection() {
      document.removeEventListener("selectionchange", storeSelection);
    };
  }, []);

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

  function rememberEditingControlPress(event: PointerEvent<HTMLElement>) {
    editingControlPressedAtRef.current = event.timeStamp;
  }

  // Editing controls act on the note, so pressing one keeps the note focused and keeps its
  // selection and the software keyboard.
  const editingControlHandlers = {
    onMouseDown: keepEditorFocus,
    onPointerDown: rememberEditingControlPress,
  };

  function updateEditing(nextIsEditing: boolean, timeStamp: number) {
    const isLeavingForEditingControl =
      !nextIsEditing && timeStamp - editingControlPressedAtRef.current < editingControlGracePeriod;
    if (!isLeavingForEditingControl) setIsEditing(nextIsEditing);
  }

  function undo() {
    if (focusEditorAtSelection()) undoEditing();
  }

  function toggleFormat() {
    setIsFormatOpen(!isFormatOpen);
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
          titleElement="h2"
          title={note ? note.title || messages["New Note"] : messages.Notes}
          titleDisplay="hidden"
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
            note ? (
              <>
                {/* Wide layouts keep every note control in the top toolbar, like iPad. */}
                {isDeleted ? null : (
                  <NoteFormatControls
                    className="max-md:hidden"
                    editingControlHandlers={editingControlHandlers}
                    isEditing={isEditing}
                    isFormatOpen={isFormatOpen}
                    messages={messages}
                    menuSide="bottom"
                    photoMenuSections={photoMenuSections}
                    onAddChecklist={addChecklist}
                    onToggleFormat={toggleFormat}
                  />
                )}
                <IosGlassGroup label={messages.More}>
                  {isEditing ? (
                    <IosBarButton
                      variant="plain"
                      aria-label={messages.Undo}
                      className="text-(--ios-label)"
                      {...editingControlHandlers}
                      onClick={undo}
                    >
                      <UndoIcon />
                    </IosBarButton>
                  ) : null}
                  <IosBarButton
                    variant="plain"
                    aria-label={messages["Share Note"]}
                    className="text-(--ios-label)"
                    onClick={function share() {
                      void shareNote();
                    }}
                  >
                    <ShareUpIcon />
                  </IosBarButton>
                  <IosMenu
                    sections={menuSections}
                    trigger={
                      <IosBarButton
                        variant="plain"
                        aria-label={messages.More}
                        className="text-(--ios-label)"
                      >
                        <EllipsisIcon />
                      </IosBarButton>
                    }
                  />
                </IosGlassGroup>
                {isEditing ? (
                  <IosBarButton
                    variant="prominent"
                    aria-label={messages.Done}
                    onClick={function finishEditing() {
                      editorRef.current?.blur();
                      setIsFormatOpen(false);
                    }}
                  >
                    <CheckIcon strokeWidth={2.8} />
                  </IosBarButton>
                ) : (
                  <IosBarButton
                    aria-label={messages["New Note"]}
                    className="text-(--ios-tint) max-md:hidden"
                    onClick={onCreateNote}
                  >
                    <ComposeIcon />
                  </IosBarButton>
                )}
              </>
            ) : (
              <IosBarButton
                aria-label={messages["New Note"]}
                className="text-(--ios-tint) max-md:hidden"
                onClick={onCreateNote}
              >
                <ComposeIcon />
              </IosBarButton>
            )
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
                onEditingChange={updateEditing}
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
      <div
        className="absolute inset-x-0 bottom-0 z-20 flex translate-y-[calc(-1*var(--keyboard-inset,0px))] flex-col md:top-[calc(3.5rem+env(safe-area-inset-top))] md:right-4 md:bottom-auto md:left-auto md:w-[380px] md:translate-y-0"
        {...editingControlHandlers}
      >
        {isFormatOpen && isEditing ? (
          <NoteFormatPanel
            editorRef={editorRef}
            focusEditor={focusEditorAtSelection}
            messages={messages}
            onClose={function closeFormat() {
              setIsFormatOpen(false);
            }}
          />
        ) : null}
      </div>
      <NotesToolbar
        label={messages.Format}
        className={cn("md:hidden", isFormatOpen && isEditing && "pointer-events-none opacity-0")}
      >
        {note && !isDeleted ? (
          <NoteFormatControls
            editingControlHandlers={editingControlHandlers}
            isEditing={isEditing}
            isFormatOpen={isFormatOpen}
            messages={messages}
            menuSide="top"
            photoMenuSections={photoMenuSections}
            onAddChecklist={addChecklist}
            onToggleFormat={toggleFormat}
          />
        ) : null}
        <span className="flex-1" />
        {isEditing ? (
          <IosBarButton
            aria-label={messages["Hide Keyboard"]}
            className="text-(--ios-tint)"
            onClick={function hideKeyboard() {
              editorRef.current?.blur();
            }}
          >
            <KeyboardDismissIcon />
          </IosBarButton>
        ) : (
          <IosBarButton
            aria-label={messages["New Note"]}
            className="text-(--ios-tint)"
            onClick={onCreateNote}
          >
            <ComposeIcon />
          </IosBarButton>
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
      <IosToast message={statusMessage} />
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

const editingControlGracePeriod = 800;

function keepEditorFocus(event: MouseEvent<HTMLElement>) {
  event.preventDefault();
}
