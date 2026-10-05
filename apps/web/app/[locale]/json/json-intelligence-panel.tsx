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
  json: string;
  labels: JsonToolLabels;
  locale: string;
  onClose: () => void;
}

type JsonAnswer = { kind: "answer"; text: string } | { kind: "schema"; text: string };

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

  function ask(question: string) {
    setAnswer(null);
    setIsCopied(false);
    void task.run(function answerQuestion(context) {
      return askAboutJson(
        json,
        question,
        locale,
        function showAnswerSoFar(text) {
          setAnswer({ kind: "answer", text });
        },
        context,
      );
    });
  }

  async function draftSchema() {
    setAnswer(null);
    setIsCopied(false);
    const schema = await task.run(function writeSchema(context) {
      return generateJsonSchema(json, locale, context);
    });
    if (schema !== undefined) setAnswer({ kind: "schema", text: schema });
  }

  async function copyAnswer() {
    if (answer && (await copyText(answer.text))) setIsCopied(true);
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
            disabled={isBusy}
            onClick={draftSchema}
          >
            {labels.aiSchema}
          </button>
          {answer && !isBusy ? (
            <button type="button" className={iosChipButtonClassName} onClick={copyAnswer}>
              {isCopied ? labels.aiCopied : labels.aiCopy}
            </button>
          ) : null}
        </>
      }
    >
      <IosIntelligencePromptField
        disabled={isBusy}
        label={labels.aiTitle}
        placeholder={labels.aiPlaceholder}
        submitLabel={labels.aiSubmit}
        onSubmit={ask}
      />
      {answer ? (
        <Text
          family={answer.kind === "schema" ? "mono" : undefined}
          className={
            answer.kind === "schema"
              ? "max-h-80 overflow-auto rounded-ios-md bg-ios-grouped-background p-3 text-ios-footnote whitespace-pre text-ios-label"
              : "text-ios-body whitespace-pre-wrap text-ios-label"
          }
        >
          {answer.text}
        </Text>
      ) : null}
    </IosIntelligenceCard>
  );
}
