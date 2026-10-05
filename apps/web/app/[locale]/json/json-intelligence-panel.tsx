"use client";

import { Text } from "@workspace/ui/components/text";
import { useState } from "react";

import type { OnDeviceAiLabels } from "../../../components/ios/ios-intelligence-card";
import type { JsonToolLabels } from "./types";

import { iosChipButtonClassName } from "../../../components/ios/ios-button-styles";
import { IosIntelligenceCard } from "../../../components/ios/ios-intelligence-card";
import { IosIntelligencePromptField } from "../../../components/ios/ios-intelligence-prompt-field";
import { copyText } from "../../../lib/copy-text";
import { useOnDeviceAiTask } from "../../../lib/on-device-ai/use-on-device-ai-task";
import { askAboutJson, generateJsonSchema } from "./json-intelligence";

interface JsonIntelligencePanelProps {
  aiLabels: OnDeviceAiLabels;
  /** The document, or null while the text is not valid JSON. */
  json: string | null;
  labels: JsonToolLabels;
  locale: string;
  onClose: () => void;
}

/** An answer remembers the document it describes, so edits hide answers that no longer apply. */
type JsonAnswer = { json: string; kind: "answer" | "schema"; text: string };

/** Answers questions about the document and drafts a JSON Schema with the on-device model. */
export function JsonIntelligencePanel({
  aiLabels,
  json,
  labels,
  locale,
  onClose,
}: JsonIntelligencePanelProps) {
  const task = useOnDeviceAiTask();
  const [answer, setAnswer] = useState<JsonAnswer | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const isBusy = task.status.kind === "working" || task.status.kind === "downloading";

  // An answer about an earlier version of the document no longer applies.
  const visibleAnswer = answer && answer.json === json ? answer : null;
  const canAsk = json !== null && !isBusy;

  function ask(question: string) {
    if (json === null) return;
    const document = json;
    setAnswer(null);
    setIsCopied(false);
    void task.run(function answerQuestion(context) {
      return askAboutJson(
        document,
        question,
        locale,
        function showAnswerSoFar(text) {
          setAnswer({ json: document, kind: "answer", text });
        },
        context,
      );
    });
  }

  async function draftSchema() {
    if (json === null) return;
    const document = json;
    setAnswer(null);
    setIsCopied(false);
    const schema = await task.run(function writeSchema(context) {
      return generateJsonSchema(document, locale, context);
    });
    if (schema !== undefined) setAnswer({ json: document, kind: "schema", text: schema });
  }

  async function copyAnswer() {
    if (visibleAnswer && (await copyText(visibleAnswer.text))) setIsCopied(true);
  }

  return (
    <IosIntelligenceCard
      className="lg:col-span-2"
      labels={aiLabels}
      status={task.status}
      title={labels.aiTitle}
      closeLabel={labels.aiClose}
      onClose={onClose}
      actions={
        <>
          <button
            type="button"
            className={iosChipButtonClassName}
            disabled={!canAsk}
            onClick={draftSchema}
          >
            {labels.aiSchema}
          </button>
          {visibleAnswer && !isBusy ? (
            <button type="button" className={iosChipButtonClassName} onClick={copyAnswer}>
              {isCopied ? labels.aiCopied : labels.aiCopy}
            </button>
          ) : null}
        </>
      }
    >
      <IosIntelligencePromptField
        disabled={!canAsk}
        label={labels.aiTitle}
        placeholder={labels.aiPlaceholder}
        submitLabel={labels.aiSubmit}
        onSubmit={ask}
      />
      {visibleAnswer ? (
        <Text
          family={visibleAnswer.kind === "schema" ? "mono" : undefined}
          className={
            visibleAnswer.kind === "schema"
              ? "max-h-80 overflow-auto rounded-ios-md bg-ios-grouped-background p-3 text-ios-footnote whitespace-pre text-ios-label"
              : "text-ios-body whitespace-pre-wrap text-ios-label"
          }
        >
          {visibleAnswer.text}
        </Text>
      ) : null}
    </IosIntelligenceCard>
  );
}
