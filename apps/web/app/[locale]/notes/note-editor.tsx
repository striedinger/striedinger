"use client";

import type { ClipboardEvent, DragEvent, PointerEvent, RefObject } from "react";

import { cn } from "@workspace/ui/lib/utils";
import { useEffectEvent, useLayoutEffect, useRef, useState } from "react";

import {
  changeIndent,
  insertImage,
  insertPlainText,
  ensureTitleLine,
  insertSanitizedHtml,
  normalizeChecklistItem,
  placeCaretAtEnd,
  prepareEditingCommands,
} from "./note-commands";
import { noteContentClassName } from "./note-content-styles";
import { isSafeNoteImageSource, sanitizeNoteHtml } from "./note-html";
import { prepareNoteImage } from "./note-image";

interface NoteEditorProps {
  editorRef: RefObject<HTMLDivElement | null>;
  html: string;
  label: string;
  noteId: string;
  onEditingChange: (isEditing: boolean, timeStamp: number) => void;
  onHtmlChange: (noteId: string, html: string) => void;
  focusOnOpen: boolean;
  onReadOnlyInteraction: () => void;
  readOnly: boolean;
}

const saveDelayMilliseconds = 280;
const checklistHitWidth = 34;

/**
 * An uncontrolled contenteditable body. React renders the stored HTML once per note and
 * never rewrites it while typing, so the caret and native undo history are preserved.
 * Changes are debounced into the store and flushed on blur, hide, and unmount.
 */
export function NoteEditor({
  editorRef,
  focusOnOpen,
  html,
  label,
  noteId,
  onEditingChange,
  onHtmlChange,
  onReadOnlyInteraction,
  readOnly,
}: NoteEditorProps) {
  const [initialHtml] = useState(function sanitizeInitialHtml() {
    return sanitizeNoteHtml(html);
  });
  const saveTimeoutRef = useRef<number | null>(null);

  function saveFrom(editor: HTMLElement) {
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (!readOnly) onHtmlChange(noteId, editor.innerHTML);
  }

  function saveNow() {
    const editor = editorRef.current;
    if (editor) saveFrom(editor);
  }

  function scheduleSave() {
    if (saveTimeoutRef.current !== null) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(saveNow, saveDelayMilliseconds);
  }

  const savePendingChanges = useEffectEvent(function savePendingChanges(editor: HTMLElement) {
    if (saveTimeoutRef.current !== null) saveFrom(editor);
  });
  const focusOpenedNote = useEffectEvent(function focusOpenedNote(editor: HTMLElement) {
    if (!focusOnOpen || readOnly) return;
    editor.focus({ preventScroll: true });
    placeCaretAtEnd(editor);
  });

  // A layout effect keeps the element reference available in cleanup, so typing that is
  // still waiting on the debounce is saved before the editor leaves the screen.
  useLayoutEffect(
    function manageEditorLifecycle() {
      const editor = editorRef.current;
      if (!editor) return;
      const activeEditor: HTMLElement = editor;
      prepareEditingCommands();
      focusOpenedNote(activeEditor);
      function saveOnPageHide() {
        savePendingChanges(activeEditor);
      }
      function saveWhenHidden() {
        if (document.visibilityState === "hidden") savePendingChanges(activeEditor);
      }
      window.addEventListener("pagehide", saveOnPageHide);
      document.addEventListener("visibilitychange", saveWhenHidden);
      return function saveBeforeUnmount() {
        window.removeEventListener("pagehide", saveOnPageHide);
        document.removeEventListener("visibilitychange", saveWhenHidden);
        savePendingChanges(activeEditor);
      };
    },
    [editorRef],
  );

  async function insertImageFiles(files: readonly File[]) {
    const sources = await Promise.all(files.map(prepareNoteImage));
    for (const source of sources) {
      if (source && isSafeNoteImageSource(source)) insertImage(source);
    }
    scheduleSave();
  }

  function toggleChecklistItem(event: PointerEvent<HTMLDivElement>) {
    const target = event.target instanceof Element ? event.target : null;
    const item = target?.closest("li");
    if (!item || item.parentElement?.getAttribute("data-type") !== "checklist") return false;
    const itemBounds = item.getBoundingClientRect();
    if (event.clientX - itemBounds.left > checklistHitWidth) return false;
    event.preventDefault();
    if (readOnly) {
      onReadOnlyInteraction();
      return true;
    }
    item.setAttribute(
      "data-checked",
      item.getAttribute("data-checked") === "true" ? "false" : "true",
    );
    if ("vibrate" in navigator) navigator.vibrate(6);
    scheduleSave();
    return true;
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    if (readOnly) return;
    const imageFiles = Array.from(event.clipboardData.files).filter(function isImage(file) {
      return file.type.startsWith("image/");
    });
    event.preventDefault();
    if (imageFiles.length > 0) {
      void insertImageFiles(imageFiles);
      return;
    }
    const pastedHtml = event.clipboardData.getData("text/html");
    if (pastedHtml) {
      insertSanitizedHtml(sanitizeNoteHtml(pastedHtml));
      return;
    }
    insertPlainText(event.clipboardData.getData("text/plain"));
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (readOnly) return;
    const imageFiles = Array.from(event.dataTransfer.files).filter(function isImage(file) {
      return file.type.startsWith("image/");
    });
    if (imageFiles.length === 0) return;
    event.preventDefault();
    const caret = document.caretPositionFromPoint?.(event.clientX, event.clientY);
    if (caret) {
      const range = document.createRange();
      range.setStart(caret.offsetNode, caret.offset);
      range.collapse(true);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
    void insertImageFiles(imageFiles);
  }

  return (
    <div
      ref={editorRef}
      role="textbox"
      aria-multiline="true"
      aria-label={label}
      aria-readonly={readOnly || undefined}
      tabIndex={0}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      spellCheck
      data-note-id={noteId}
      className={cn(noteContentClassName, "min-h-full px-5 pt-1 pb-40")}
      dangerouslySetInnerHTML={{ __html: initialHtml }}
      onFocus={function startEditing(event) {
        onEditingChange(true, event.timeStamp);
      }}
      onBlur={function stopEditing(event) {
        saveNow();
        onEditingChange(false, event.timeStamp);
      }}
      onInput={function handleInput(event) {
        const editor = event.currentTarget;
        if ((event.nativeEvent as InputEvent).inputType === "insertParagraph") {
          normalizeChecklistItem(editor);
        }
        ensureTitleLine(editor);
        scheduleSave();
      }}
      onPointerDown={function handlePointerDown(event) {
        if (toggleChecklistItem(event)) return;
        if (readOnly) onReadOnlyInteraction();
      }}
      onKeyDown={function handleKeyDown(event) {
        if (event.key !== "Tab") return;
        const editor = event.currentTarget;
        const selectionNode = window.getSelection()?.anchorNode;
        const element =
          selectionNode instanceof Element ? selectionNode : selectionNode?.parentElement;
        if (!element?.closest("li")) return;
        event.preventDefault();
        changeIndent(editor, event.shiftKey ? "decrease" : "increase");
        scheduleSave();
      }}
      onPaste={handlePaste}
      onDrop={handleDrop}
    />
  );
}
