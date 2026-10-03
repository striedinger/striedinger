"use client";

import type { ReactNode, RefObject } from "react";

import { CloseIcon } from "@workspace/icons/close-icon";
import { IndentDecreaseIcon } from "@workspace/icons/indent-decrease-icon";
import { IndentIncreaseIcon } from "@workspace/icons/indent-increase-icon";
import { ListBulletIcon } from "@workspace/icons/list-bullet-icon";
import { ListDashIcon } from "@workspace/icons/list-dash-icon";
import { ListNumberIcon } from "@workspace/icons/list-number-icon";
import { QuoteIcon } from "@workspace/icons/quote-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useState } from "react";

import type { NotesMessages } from "./types";

import { iosStrongGlassClassName } from "../../components/ios/ios-glass";
import {
  applyBlockStyle,
  changeIndent,
  emptyFormatState,
  readFormatState,
  toggleBlockQuote,
  toggleInlineStyle,
  toggleList,
  type NoteBlockStyle,
  type NoteFormatState,
  type NoteInlineStyle,
  type NoteListStyle,
} from "./note-commands";
import { NoteFormatIconButton } from "./note-format-icon-button";

interface NoteFormatPanelProps {
  editorRef: RefObject<HTMLDivElement | null>;
  /** Focuses the note with its last selection restored and returns it, if it is open. */
  focusEditor: () => HTMLDivElement | null;
  messages: NotesMessages;
  onClose: () => void;
}

export function NoteFormatPanel({
  editorRef,
  focusEditor,
  messages,
  onClose,
}: NoteFormatPanelProps) {
  const [formatState, setFormatState] = useState<NoteFormatState>(emptyFormatState);
  const blockStyles: ReadonlyArray<{ className: string; label: string; style: NoteBlockStyle }> = [
    { style: "h1", label: messages.Title, className: "text-[22px] font-bold" },
    { style: "h2", label: messages.Heading, className: "text-[18px] font-bold" },
    { style: "h3", label: messages.Subheading, className: "text-[16px] font-semibold" },
    { style: "p", label: messages.Body, className: "text-[15px]" },
    { style: "pre", label: messages.Monostyled, className: "font-mono text-[14px]" },
  ];
  const inlineStyles: ReadonlyArray<{ className: string; label: string; style: NoteInlineStyle }> =
    [
      { style: "bold", label: messages.Bold, className: "font-bold" },
      { style: "italic", label: messages.Italic, className: "italic font-serif" },
      { style: "underline", label: messages.Underline, className: "underline underline-offset-2" },
      { style: "strikeThrough", label: messages.Strikethrough, className: "line-through" },
    ];
  const listStyles: ReadonlyArray<{ icon: ReactNode; label: string; style: NoteListStyle }> = [
    { style: "bulleted", label: messages["Bulleted List"], icon: <ListBulletIcon /> },
    { style: "dashed", label: messages["Dashed List"], icon: <ListDashIcon /> },
    { style: "numbered", label: messages["Numbered List"], icon: <ListNumberIcon /> },
  ];

  useEffect(
    function trackSelectionFormat() {
      let frame = 0;
      function updateFormatState() {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(function readSelectionFormat() {
          const editor = editorRef.current;
          if (editor) setFormatState(readFormatState(editor));
        });
      }
      document.addEventListener("selectionchange", updateFormatState);
      updateFormatState();
      return function stopTrackingSelectionFormat() {
        cancelAnimationFrame(frame);
        document.removeEventListener("selectionchange", updateFormatState);
      };
    },
    [editorRef],
  );

  function runFormatCommand(command: (editor: HTMLDivElement) => void) {
    const editor = focusEditor();
    if (!editor) return;
    command(editor);
    setFormatState(readFormatState(editor));
  }

  return (
    <section
      aria-label={messages.Format}
      className={cn(
        "mx-2 mb-[max(env(safe-area-inset-bottom),8px)] flex flex-col gap-3 rounded-[32px] px-5 pt-4 pb-5",
        iosStrongGlassClassName,
      )}
    >
      <div className="flex items-center justify-between">
        <Text as="h2" className="text-[20px] leading-[25px] font-bold text-(--ios-label)">
          {messages.Format}
        </Text>
        <button
          type="button"
          aria-label={messages["Close Format"]}
          className="flex size-[30px] items-center justify-center rounded-full bg-(--ios-fill) text-(--ios-secondary-label) outline-none focus-visible:ring-2 focus-visible:ring-(--ios-tint)"
          onClick={onClose}
        >
          <CloseIcon className="size-3.5" strokeWidth={3} />
        </button>
      </div>
      <div className="-mx-4 flex snap-x gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
        {blockStyles.map(function renderBlockStyle(blockStyle) {
          const isActive = formatState.blockStyle === blockStyle.style;
          return (
            <button
              key={blockStyle.style}
              type="button"
              aria-pressed={isActive}
              className={cn(
                "h-9 shrink-0 snap-start rounded-full px-3.5 whitespace-nowrap text-(--ios-label) outline-none focus-visible:ring-2 focus-visible:ring-(--ios-tint) aria-pressed:bg-(--ios-tint) aria-pressed:text-black",
                blockStyle.className,
              )}
              onClick={function selectBlockStyle() {
                runFormatCommand(function applySelectedBlockStyle(editor) {
                  applyBlockStyle(editor, blockStyle.style);
                });
              }}
            >
              {blockStyle.label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-4 overflow-hidden rounded-[14px] bg-(--ios-fill)/60">
        {inlineStyles.map(function renderInlineStyle(inlineStyle) {
          const isActive = formatState[inlineStyle.style];
          return (
            <button
              key={inlineStyle.style}
              type="button"
              aria-label={inlineStyle.label}
              aria-pressed={isActive}
              className="h-11 text-[19px] text-(--ios-label) outline-none not-last:border-r-[0.5px] not-last:border-(--ios-separator) focus-visible:bg-(--ios-fill) aria-pressed:bg-(--ios-tint) aria-pressed:text-black"
              onClick={function toggleSelectedInlineStyle() {
                runFormatCommand(function applyInlineStyle() {
                  toggleInlineStyle(inlineStyle.style);
                });
              }}
            >
              <span aria-hidden="true" className={inlineStyle.className}>
                {inlineStyle.label.charAt(0).toLocaleUpperCase()}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <div className="grid flex-[3] grid-cols-3 overflow-hidden rounded-[14px] bg-(--ios-fill)/60">
          {listStyles.map(function renderListStyle(listStyle) {
            return (
              <NoteFormatIconButton
                key={listStyle.style}
                label={listStyle.label}
                pressed={formatState.listStyle === listStyle.style}
                onClick={function toggleSelectedList() {
                  runFormatCommand(function applyListStyle(editor) {
                    toggleList(editor, listStyle.style);
                  });
                }}
              >
                {listStyle.icon}
              </NoteFormatIconButton>
            );
          })}
        </div>
        <div className="grid flex-[2] grid-cols-2 overflow-hidden rounded-[14px] bg-(--ios-fill)/60">
          <NoteFormatIconButton
            label={messages["Decrease Indent"]}
            disabled={!formatState.inList}
            onClick={function decreaseIndent() {
              runFormatCommand(function applyDecreaseIndent(editor) {
                changeIndent(editor, "decrease");
              });
            }}
          >
            <IndentDecreaseIcon />
          </NoteFormatIconButton>
          <NoteFormatIconButton
            label={messages["Increase Indent"]}
            disabled={!formatState.inList}
            onClick={function increaseIndent() {
              runFormatCommand(function applyIncreaseIndent(editor) {
                changeIndent(editor, "increase");
              });
            }}
          >
            <IndentIncreaseIcon />
          </NoteFormatIconButton>
        </div>
        <div className="grid flex-1 overflow-hidden rounded-[14px] bg-(--ios-fill)/60">
          <NoteFormatIconButton
            label={messages["Block Quote"]}
            pressed={formatState.blockQuote}
            onClick={function toggleQuote() {
              runFormatCommand(toggleBlockQuote);
            }}
          >
            <QuoteIcon />
          </NoteFormatIconButton>
        </div>
      </div>
    </section>
  );
}
