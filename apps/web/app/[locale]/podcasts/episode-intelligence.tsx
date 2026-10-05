"use client";

import { SparklesIcon } from "@workspace/icons/sparkles-icon";
import { Text } from "@workspace/ui/components/text";
import { useEffect, useState } from "react";

import type { OnDeviceAiLabels } from "../../../components/ios/ios-intelligence-card";
import type { PodcastMessages } from "./types";

import { iosChipButtonClassName } from "../../../components/ios/ios-button-styles";
import { IosIntelligenceCard } from "../../../components/ios/ios-intelligence-card";
import { findTranslatableLanguage } from "../../../lib/on-device-ai/find-translatable-language";
import { readStreamedText } from "../../../lib/on-device-ai/on-device-ai-session";
import { useOnDeviceAiTask } from "../../../lib/on-device-ai/use-on-device-ai-task";
import {
  getEpisodeSummaryOptions,
  minimumSummarizedCharacters,
} from "./episode-intelligence-options";

interface EpisodeIntelligenceProps {
  aiLabels: OnDeviceAiLabels;
  canSummarize: boolean;
  canTranslate: boolean;
  description: string;
  locale: string;
  messages: PodcastMessages;
}

type EpisodeResult = { kind: "key-points" | "translation"; text: string };

/**
 * On-device extras for an episode description: its key points, and a translation when it is
 * written in another language. Each control appears only when the browser can provide it.
 */
export function EpisodeIntelligence({
  aiLabels,
  canSummarize,
  canTranslate,
  description,
  locale,
  messages,
}: EpisodeIntelligenceProps) {
  const task = useOnDeviceAiTask();
  const [result, setResult] = useState<EpisodeResult | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState<string | null>(null);
  const isBusy = task.status.kind === "working" || task.status.kind === "downloading";
  const canShowKeyPoints = canSummarize && description.length >= minimumSummarizedCharacters;

  useEffect(
    function detectForeignDescription() {
      if (!canTranslate) return;
      let isCurrent = true;
      findTranslatableLanguage(description, locale)
        .then(function offerTranslation(language) {
          if (isCurrent && language) setSourceLanguage(language.sourceLanguage);
          return undefined;
        })
        .catch(function leaveUntranslated() {
          return undefined;
        });
      return function ignoreStaleDetection() {
        isCurrent = false;
      };
    },
    [canTranslate, description, locale],
  );

  if (!canShowKeyPoints && sourceLanguage === null) return null;
  const languageName =
    sourceLanguage === null
      ? ""
      : (new Intl.DisplayNames([locale], { type: "language" }).of(sourceLanguage) ??
        sourceLanguage);

  function showKeyPoints() {
    setResult({ kind: "key-points", text: "" });
    void task.run(async function summarizeDescription({ monitor, signal }) {
      const summarizer = await Summarizer.create({
        ...getEpisodeSummaryOptions(locale),
        sharedContext: "A podcast episode description.",
        monitor,
        signal,
      });
      try {
        return await readStreamedText(
          summarizer.summarizeStreaming(description, { signal }),
          function showKeyPointsSoFar(text) {
            setResult({ kind: "key-points", text });
          },
        );
      } finally {
        summarizer.destroy();
      }
    });
  }

  function translateDescription(language: string) {
    setResult({ kind: "translation", text: "" });
    void task.run(async function translate({ monitor, signal }) {
      const translator = await Translator.create({
        sourceLanguage: language,
        targetLanguage: locale,
        monitor,
        signal,
      });
      try {
        const text = await translator.translate(description, { signal });
        setResult({ kind: "translation", text });
        return text;
      } finally {
        translator.destroy();
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 pt-5">
      <div className="flex flex-wrap gap-2">
        {canShowKeyPoints ? (
          <button
            type="button"
            disabled={isBusy}
            className={`${iosChipButtonClassName} gap-1.5 [&_svg]:size-4`}
            onClick={showKeyPoints}
          >
            <SparklesIcon aria-hidden="true" />
            {messages["Key Points"]}
          </button>
        ) : null}
        {sourceLanguage !== null ? (
          <button
            type="button"
            disabled={isBusy}
            className={`${iosChipButtonClassName} gap-1.5 [&_svg]:size-4`}
            onClick={function translateOnRequest() {
              translateDescription(sourceLanguage);
            }}
          >
            <SparklesIcon aria-hidden="true" />
            {messages["Translate from {language}"].replace("{language}", languageName)}
          </button>
        ) : null}
      </div>
      {result ? (
        <IosIntelligenceCard
          closeLabel={messages.Close}
          labels={aiLabels}
          onClose={function closeResult() {
            task.reset();
            setResult(null);
          }}
          status={task.status}
          title={
            result.kind === "key-points"
              ? messages["Key Points"]
              : messages["Translated from {language}"].replace("{language}", languageName)
          }
        >
          {result.text ? (
            <Text
              lang={locale}
              className="text-ios-body leading-[24px] whitespace-pre-line text-ios-label"
            >
              {result.text}
            </Text>
          ) : null}
        </IosIntelligenceCard>
      ) : null}
    </div>
  );
}
