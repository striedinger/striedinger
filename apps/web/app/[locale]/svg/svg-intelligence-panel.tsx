"use client";

import { useState } from "react";

import type { OnDeviceAiLabels } from "../../../components/ios/ios-intelligence-card";
import type { SvgEditorLabels } from "./types";

import { iosChipButtonClassName } from "../../../components/ios/ios-button-styles";
import { IosIntelligenceCard } from "../../../components/ios/ios-intelligence-card";
import { IosIntelligencePromptField } from "../../../components/ios/ios-intelligence-prompt-field";
import { useOnDeviceAiTask } from "../../../lib/on-device-ai/use-on-device-ai-task";
import { describeSvgWithModel, editSvgWithModel } from "./svg-intelligence";

interface SvgIntelligencePanelProps {
  aiLabels: OnDeviceAiLabels;
  canDescribe: boolean;
  dimensions: { height: number | null; width: number | null };
  isSourceValid: boolean;
  labels: SvgEditorLabels;
  locale: string;
  onClose: () => void;
  onSourceChange: (source: string) => void;
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
  onSourceChange,
  source,
}: SvgIntelligencePanelProps) {
  const task = useOnDeviceAiTask();
  const [previousSource, setPreviousSource] = useState<string | null>(null);
  const isBusy = task.status.kind === "working" || task.status.kind === "downloading";

  async function applyResult(request: Promise<string | undefined>) {
    const originalSource = source;
    const updatedSource = await request;
    if (updatedSource === undefined) return;
    setPreviousSource(originalSource);
    onSourceChange(updatedSource);
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
    if (previousSource === null) return;
    onSourceChange(previousSource);
    setPreviousSource(null);
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
          {previousSource !== null && !isBusy ? (
            <button type="button" className={iosChipButtonClassName} onClick={undo}>
              {labels.aiUndo}
            </button>
          ) : null}
        </>
      }
    >
      <IosIntelligencePromptField
        disabled={!isSourceValid || isBusy}
        label={labels.aiTitle}
        placeholder={labels.aiPlaceholder}
        submitLabel={labels.aiSubmit}
        onSubmit={editDrawing}
      />
    </IosIntelligenceCard>
  );
}
