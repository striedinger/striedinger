"use client";

import { Text } from "@workspace/ui/components/text";
import { useState } from "react";

import type { OnDeviceAiLabels } from "../../../components/ios/ios-intelligence-card";
import type { SvgEditorLabels } from "./types";

import { iosChipButtonClassName } from "../../../components/ios/ios-button-styles";
import { IosIntelligenceCard } from "../../../components/ios/ios-intelligence-card";
import { IosIntelligencePromptField } from "../../../components/ios/ios-intelligence-prompt-field";
import { useOnDeviceAiTask } from "../../../lib/on-device-ai/use-on-device-ai-task";
import { describeSvgWithModel, editSvgWithModel } from "./svg-intelligence";

const maximumAiSourceCharacters = 12_000;

interface SvgIntelligencePanelProps {
  aiLabels: OnDeviceAiLabels;
  canDescribe: boolean;
  dimensions: { height: number | null; width: number | null };
  isSourceValid: boolean;
  labels: SvgEditorLabels;
  locale: string;
  onClose: () => void;
  /** Replaces the drawing with `nextSource` only if it still equals `expectedSource`. */
  onReplaceSource: (expectedSource: string, nextSource: string) => void;
  source: string;
}

/**
 * Edits the drawing from a plain-language request, or writes an accessible title and
 * description by looking at it, all with the browser's on-device model. Loaded on first use.
 */
export function SvgIntelligencePanel({
  aiLabels,
  canDescribe,
  dimensions,
  isSourceValid,
  labels,
  locale,
  onClose,
  onReplaceSource,
  source,
}: SvgIntelligencePanelProps) {
  const task = useOnDeviceAiTask();
  const [undoChange, setUndoChange] = useState<{ applied: string; previous: string } | null>(null);
  // The model reads and rewrites the whole drawing, so large files exceed what it can hold.
  const isTooLarge = source.length > maximumAiSourceCharacters;
  const isBusy = task.status.kind === "working" || task.status.kind === "downloading";

  async function applyResult(request: Promise<string | undefined>) {
    const originalSource = source;
    const updatedSource = await request;
    if (updatedSource === undefined) return;
    onReplaceSource(originalSource, updatedSource);
    setUndoChange({ applied: updatedSource, previous: originalSource });
  }

  function editDrawing(request: string) {
    void applyResult(
      task.run(function editWithModel(context) {
        return editSvgWithModel(source, request, locale, context);
      }),
    );
  }

  function describeDrawing() {
    void applyResult(
      task.run(function describeWithModel(context) {
        return describeSvgWithModel(source, locale, dimensions, context);
      }),
    );
  }

  function undo() {
    if (!undoChange) return;
    onReplaceSource(undoChange.applied, undoChange.previous);
    setUndoChange(null);
    task.reset();
  }

  return (
    <IosIntelligenceCard
      className="pointer-events-auto w-full max-w-md shadow-ios-floating"
      labels={aiLabels}
      status={task.status}
      title={labels.aiTitle}
      closeLabel={labels.aiClose}
      onClose={onClose}
      actions={
        <>
          {canDescribe ? (
            <button
              type="button"
              className={iosChipButtonClassName}
              disabled={!isSourceValid || isBusy}
              onClick={describeDrawing}
            >
              {labels.aiDescribe}
            </button>
          ) : null}
          {undoChange && !isBusy ? (
            <button type="button" className={iosChipButtonClassName} onClick={undo}>
              {labels.aiUndo}
            </button>
          ) : null}
        </>
      }
    >
      {isTooLarge ? (
        <Text className="text-ios-footnote text-ios-secondary-label">{labels.aiTooLarge}</Text>
      ) : null}
      <IosIntelligencePromptField
        disabled={!isSourceValid || isBusy || isTooLarge}
        label={labels.aiTitle}
        placeholder={labels.aiPlaceholder}
        submitLabel={labels.aiSubmit}
        onSubmit={editDrawing}
      />
    </IosIntelligenceCard>
  );
}
