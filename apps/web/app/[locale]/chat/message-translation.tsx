"use client";

import { Text } from "@workspace/ui/components/text";
import { useEffect, useState } from "react";

import type { ChatLabels } from "./types";

import { findTranslatableLanguage } from "../../../lib/on-device-ai/find-translatable-language";
import { monitorDownload } from "../../../lib/on-device-ai/on-device-ai-session";
import { translateMessage } from "./message-translation-service";

interface MessageTranslationProps {
  labels: ChatLabels;
  locale: string;
  text: string;
}

const minimumDetectableCharacters = 12;

type TranslationState =
  | { kind: "none" }
  | { kind: "offer"; sourceLanguage: string }
  | { kind: "translating"; progress: number | null; sourceLanguage: string }
  | { kind: "translated"; sourceLanguage: string; text: string };

/**
 * Shows a received message in the reader's language when it was written in another one,
 * translated on the device. Renders nothing for messages already in the reader's language.
 */
export function MessageTranslation({ labels, locale, text }: MessageTranslationProps) {
  const [state, setState] = useState<TranslationState>({ kind: "none" });

  useEffect(
    function translateWhenForeign() {
      let isCurrent = true;
      async function translate() {
        // Short messages are too ambiguous to detect reliably, so they stay as written.
        if (text.trim().length < minimumDetectableCharacters) return;
        const language = await findTranslatableLanguage(text, locale);
        if (!isCurrent || !language) return;
        // Downloading a language pack needs a tap, so only installed packs translate on their own.
        if (!language.isReady) {
          setState({ kind: "offer", sourceLanguage: language.sourceLanguage });
          return;
        }
        const translatedText = await translateMessage(text, language.sourceLanguage, locale);
        if (isCurrent) {
          setState({
            kind: "translated",
            sourceLanguage: language.sourceLanguage,
            text: translatedText,
          });
        }
      }
      translate().catch(function stayUntranslated() {
        if (isCurrent) setState({ kind: "none" });
      });
      return function ignoreStaleTranslation() {
        isCurrent = false;
      };
    },
    [locale, text],
  );

  if (state.kind === "none") return null;
  const languageName =
    new Intl.DisplayNames([locale], { type: "language" }).of(state.sourceLanguage) ??
    state.sourceLanguage;

  async function downloadAndTranslate(sourceLanguage: string) {
    setState({ kind: "translating", progress: null, sourceLanguage });
    try {
      const translatedText = await translateMessage(
        text,
        sourceLanguage,
        locale,
        monitorDownload(function showProgress(progress) {
          setState({ kind: "translating", progress, sourceLanguage });
        }),
      );
      setState({ kind: "translated", sourceLanguage, text: translatedText });
    } catch {
      setState({ kind: "offer", sourceLanguage });
    }
  }

  if (state.kind === "offer" || state.kind === "translating") {
    return (
      <button
        type="button"
        disabled={state.kind === "translating"}
        className="px-3 pt-1 text-ios-caption1 font-semibold text-ios-tint outline-none select-none focus-visible:underline active:opacity-50 disabled:text-ios-secondary-label"
        onClick={function translateOnRequest() {
          void downloadAndTranslate(state.sourceLanguage);
        }}
      >
        {state.kind === "translating"
          ? state.progress !== null && state.progress > 0 && state.progress < 1
            ? labels.downloadingTranslation.replace(
                "{percent}",
                `${Math.round(state.progress * 100)}%`,
              )
            : labels.translating
          : labels.translateFrom.replace("{language}", languageName)}
      </button>
    );
  }

  return (
    <div className="flex max-w-[min(75%,30rem)] flex-col items-start gap-0.5 pt-1">
      <Text
        lang={locale}
        className="rounded-ios-lg border border-ios-separator px-3 py-1.75 text-ios-body break-words whitespace-pre-wrap text-ios-label"
      >
        {state.text}
      </Text>
      <Text className="px-3 text-ios-caption2 text-ios-secondary-label">
        {labels.translatedFrom.replace("{language}", languageName)}
      </Text>
    </div>
  );
}
