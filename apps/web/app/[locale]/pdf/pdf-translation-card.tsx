"use client";

import { Text } from "@workspace/ui/components/text";
import { useEffect, useEffectEvent, useState } from "react";

import type { OnDeviceAiLabels } from "../../../components/ios/ios-intelligence-card";
import type { PdfToolLabels } from "./types";

import { iosChipButtonClassName } from "../../../components/ios/ios-button-styles";
import { IosIntelligenceCard } from "../../../components/ios/ios-intelligence-card";
import { copyText } from "../../../lib/copy-text";
import { findTranslatableLanguage } from "../../../lib/on-device-ai/find-translatable-language";
import { translateLongText } from "../../../lib/on-device-ai/translate-long-text";
import { useOnDeviceAiTask } from "../../../lib/on-device-ai/use-on-device-ai-task";
import { extractPdfText } from "./extract-pdf-text";

interface PdfTranslationCardProps {
  aiLabels: OnDeviceAiLabels;
  file: File;
  labels: PdfToolLabels;
  locale: string;
  onClose: () => void;
  password: string;
}

type TranslationOutcome =
  | { kind: "pending" }
  | { kind: "no-text" | "same-language" }
  | { kind: "translated"; sourceLanguage: string; text: string };

/** The document's text in the reader's language, translated on the device. */
export function PdfTranslationCard({
  aiLabels,
  file,
  labels,
  locale,
  onClose,
  password,
}: PdfTranslationCardProps) {
  const task = useOnDeviceAiTask();
  const [outcome, setOutcome] = useState<TranslationOutcome>({ kind: "pending" });
  const [isCopied, setIsCopied] = useState(false);

  function translate() {
    void task.run(async function translateDocument({ monitor, signal }) {
      const text = await extractPdfText(file, password, signal);
      if (!text) {
        setOutcome({ kind: "no-text" });
        return "";
      }
      const language = await findTranslatableLanguage(text.slice(0, 2_000), locale);
      if (!language) {
        setOutcome({ kind: "same-language" });
        return "";
      }
      const translator = await Translator.create({
        sourceLanguage: language.sourceLanguage,
        targetLanguage: locale,
        monitor,
        signal,
      });
      try {
        return await translateLongText(
          translator,
          text,
          function showTranslationSoFar(translation) {
            setOutcome({
              kind: "translated",
              sourceLanguage: language.sourceLanguage,
              text: translation,
            });
          },
          signal,
        );
      } finally {
        translator.destroy();
      }
    });
  }

  const startTranslation = useEffectEvent(function translateOnOpen() {
    translate();
  });

  // The card opens from a tap on Translate and is keyed by file, so it starts once.
  useEffect(function translateWhenOpened() {
    startTranslation();
  }, []);

  async function copyTranslation() {
    if (outcome.kind === "translated" && (await copyText(outcome.text))) setIsCopied(true);
  }

  const languageName =
    outcome.kind === "translated"
      ? (new Intl.DisplayNames([locale], { type: "language" }).of(outcome.sourceLanguage) ??
        outcome.sourceLanguage)
      : "";

  return (
    <IosIntelligenceCard
      closeLabel={labels.closeSummary}
      labels={aiLabels}
      onClose={onClose}
      onRetry={function retryTranslation() {
        setOutcome({ kind: "pending" });
        translate();
      }}
      status={task.status}
      title={
        outcome.kind === "translated"
          ? labels.translatedFrom.replace("{language}", languageName)
          : labels.translation
      }
      actions={
        outcome.kind === "translated" && task.status.kind === "done" ? (
          <button type="button" className={iosChipButtonClassName} onClick={copyTranslation}>
            {isCopied ? labels.translationCopied : labels.copyTranslation}
          </button>
        ) : undefined
      }
    >
      {outcome.kind === "no-text" || outcome.kind === "same-language" ? (
        <Text className="text-ios-body text-ios-secondary-label">
          {outcome.kind === "no-text" ? labels.noText : labels.sameLanguage}
        </Text>
      ) : outcome.kind === "translated" ? (
        <Text
          lang={locale}
          className="max-h-96 overflow-y-auto overscroll-contain text-ios-body whitespace-pre-line text-ios-label"
        >
          {outcome.text}
        </Text>
      ) : null}
    </IosIntelligenceCard>
  );
}
