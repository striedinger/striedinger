"use client";

import type { RefObject } from "react";

import { CheckCircleIcon } from "@workspace/icons/check-circle-icon";
import { RefreshIcon } from "@workspace/icons/refresh-icon";
import { Text } from "@workspace/ui/components/text";
import { useState } from "react";

import type { OnDeviceAiLabels } from "../../../components/ios/ios-intelligence-card";
import type { NoteTextSnapshot } from "./note-writing-text";
import type { NoteRewriteStyle, NoteSummaryStyle } from "./note-writing-tools";
import type { NotesMessages } from "./types";

import { iosChipButtonClassName } from "../../../components/ios/ios-button-styles";
import { IosIntelligenceCard } from "../../../components/ios/ios-intelligence-card";
import { copyText } from "../../../lib/copy-text";
import { useOnDeviceAiTask } from "../../../lib/on-device-ai/use-on-device-ai-task";
import {
  applyNoteCorrections,
  canReplaceWholeNote,
  readNoteText,
  replaceNoteText,
} from "./note-writing-text";
import { proofreadNote, rewriteNote, summarizeNote } from "./note-writing-tools";

export interface NoteWritingToolsAvailability {
  proofread: boolean;
  rewrite: boolean;
  summarize: boolean;
}

interface NoteWritingToolsPanelProps {
  aiLabels: OnDeviceAiLabels;
  availability: NoteWritingToolsAvailability;
  editorRef: RefObject<HTMLDivElement | null>;
  /** The selected text's range, or null to work on the whole note. */
  getSelectionRange: () => Range | null;
  locale: string;
  messages: NotesMessages;
  onClose: () => void;
}

type WritingResult =
  | {
      kind: "proofread";
      corrections: readonly ProofreadCorrection[];
      snapshot: NoteTextSnapshot;
      text: string;
    }
  | { kind: "rewrite"; canReplace: boolean; range: Range | null; text: string }
  | { kind: "summary"; text: string };

const toolButtonClassName =
  "flex h-16 flex-col items-center justify-center gap-1 rounded-ios-lg bg-ios-grouped-background text-ios-subheadline font-semibold text-ios-label outline-none select-none focus-visible:ring-2 focus-visible:ring-ios-tint/50 active:bg-ios-fill [&_svg]:size-5 [&_svg]:text-ios-tint";
const groupClassName = "flex flex-col overflow-hidden rounded-ios-lg bg-ios-grouped-background";
const rowClassName =
  "relative flex min-h-11 items-center px-4 text-left text-ios-body text-ios-label outline-none select-none not-last:after:absolute not-last:after:right-0 not-last:after:bottom-0 not-last:after:left-4 not-last:after:h-px not-last:after:scale-y-50 not-last:after:bg-ios-separator focus-visible:bg-ios-fill active:bg-ios-fill disabled:text-ios-tertiary-label";

/**
 * Apple-style Writing Tools for the open note: proofread or rewrite the selection or the whole
 * note, or summarize it, all with the browser's on-device models. Loaded on first use.
 */
export function NoteWritingToolsPanel({
  aiLabels,
  availability,
  editorRef,
  getSelectionRange,
  locale,
  messages,
  onClose,
}: NoteWritingToolsPanelProps) {
  const task = useOnDeviceAiTask();
  const [result, setResult] = useState<WritingResult | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const isBusy = task.status.kind === "working" || task.status.kind === "downloading";

  function readTarget() {
    const editor = editorRef.current;
    if (!editor) return null;
    const range = getSelectionRange();
    const snapshot = readNoteText(editor, range);
    return snapshot.text ? { editor, range, snapshot } : null;
  }

  async function proofread() {
    const target = readTarget();
    if (!target) return;
    setIsCopied(false);
    const proofreading = await task.run(function proofreadText(context) {
      return proofreadNote(target.snapshot.text, locale, context);
    });
    if (!proofreading) return;
    setResult({
      kind: "proofread",
      corrections: proofreading.corrections,
      snapshot: target.snapshot,
      text: proofreading.correctedInput,
    });
  }

  function rewrite(style: NoteRewriteStyle) {
    const target = readTarget();
    if (!target) return;
    setIsCopied(false);
    const canReplace = target.range !== null || canReplaceWholeNote(target.editor);
    setResult({ kind: "rewrite", canReplace, range: target.range, text: "" });
    void task.run(function rewriteText(context) {
      return rewriteNote(
        target.snapshot.text,
        style,
        locale,
        function showRewriteSoFar(text) {
          setResult({ kind: "rewrite", canReplace, range: target.range, text });
        },
        context,
      );
    });
  }

  function summarize(style: NoteSummaryStyle) {
    const target = readTarget();
    if (!target) return;
    setIsCopied(false);
    setResult({ kind: "summary", text: "" });
    void task.run(function summarizeText(context) {
      return summarizeNote(
        target.snapshot.text,
        style,
        locale,
        function showSummarySoFar(text) {
          setResult({ kind: "summary", text });
        },
        context,
      );
    });
  }

  function replace() {
    const editor = editorRef.current;
    if (!editor || !result) return;
    if (result.kind === "proofread") {
      applyNoteCorrections(editor, result.snapshot, result.corrections);
    } else if (result.kind === "rewrite") {
      replaceNoteText(editor, result.range, result.text);
    }
    onClose();
  }

  async function copyResult() {
    if (result && (await copyText(result.text))) setIsCopied(true);
  }

  function showTools() {
    task.reset();
    setResult(null);
  }

  const canReplace =
    !isBusy &&
    result !== null &&
    ((result.kind === "proofread" && result.corrections.length > 0) ||
      (result.kind === "rewrite" && result.canReplace && result.text.trim() !== ""));
  const rewriteStyles: readonly { label: string; style: NoteRewriteStyle }[] = [
    { label: messages.Friendly, style: "friendly" },
    { label: messages.Professional, style: "professional" },
    { label: messages.Concise, style: "concise" },
  ];
  const summaryStyles: readonly { label: string; style: NoteSummaryStyle }[] = [
    { label: messages.Summary, style: "summary" },
    { label: messages["Key Points"], style: "key-points" },
  ];

  return (
    <IosIntelligenceCard
      className="mx-2 mb-safe-keyboard-min-2 shadow-ios-floating md:m-0 md:mt-2"
      closeLabel={messages["Close Writing Tools"]}
      labels={aiLabels}
      onClose={onClose}
      status={task.status}
      title={messages["Writing Tools"]}
      actions={
        result ? (
          <>
            {canReplace ? (
              <button type="button" className={iosChipButtonClassName} onClick={replace}>
                {messages.Replace}
              </button>
            ) : null}
            {!isBusy && result.text ? (
              <button type="button" className={iosChipButtonClassName} onClick={copyResult}>
                {isCopied ? messages["Copied to Clipboard"] : messages.Copy}
              </button>
            ) : null}
            <button type="button" className={iosChipButtonClassName} onClick={showTools}>
              {messages.Back}
            </button>
          </>
        ) : undefined
      }
    >
      {result ? (
        <div className="flex max-h-60 flex-col gap-1.5 overflow-y-auto overscroll-contain">
          {result.kind === "proofread" ? (
            <Text className="text-ios-footnote font-semibold text-ios-secondary-label">
              {result.corrections.length === 0
                ? messages["No corrections needed."]
                : messages["{count} corrections"].replace(
                    "{count}",
                    String(result.corrections.length),
                  )}
            </Text>
          ) : null}
          {result.text ? (
            <Text className="text-ios-body whitespace-pre-wrap text-ios-label">{result.text}</Text>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {availability.proofread || availability.rewrite ? (
            <div className="grid auto-cols-fr grid-flow-col gap-2">
              {availability.proofread ? (
                <button
                  type="button"
                  disabled={isBusy}
                  className={toolButtonClassName}
                  onClick={proofread}
                >
                  <CheckCircleIcon aria-hidden="true" />
                  {messages.Proofread}
                </button>
              ) : null}
              {availability.rewrite ? (
                <button
                  type="button"
                  disabled={isBusy}
                  className={toolButtonClassName}
                  onClick={function rewriteText() {
                    rewrite("rewrite");
                  }}
                >
                  <RefreshIcon aria-hidden="true" />
                  {messages.Rewrite}
                </button>
              ) : null}
            </div>
          ) : null}
          {availability.rewrite ? (
            <div className={groupClassName}>
              {rewriteStyles.map(function renderRewriteStyle(option) {
                return (
                  <button
                    key={option.style}
                    type="button"
                    disabled={isBusy}
                    className={rowClassName}
                    onClick={function rewriteInStyle() {
                      rewrite(option.style);
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : null}
          {availability.summarize ? (
            <div className={groupClassName}>
              {summaryStyles.map(function renderSummaryStyle(option) {
                return (
                  <button
                    key={option.style}
                    type="button"
                    disabled={isBusy}
                    className={rowClassName}
                    onClick={function summarizeInStyle() {
                      summarize(option.style);
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </IosIntelligenceCard>
  );
}
