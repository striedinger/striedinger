import type { Locale, TranslationCatalog } from "@workspace/i18n";

import { cache } from "react";

import type { messages as englishMessages } from "./en";

const loadPodcastMessagesCached = cache(loadMessagesForLocale);

export function loadPodcastMessages(
  locale: Locale,
): Promise<TranslationCatalog<typeof englishMessages>> {
  return loadPodcastMessagesCached(locale);
}

async function loadMessagesForLocale(
  locale: Locale,
): Promise<TranslationCatalog<typeof englishMessages>> {
  switch (locale) {
    case "es":
      return (await import("./es")).messages;
    case "de":
      return (await import("./de")).messages;
    case "it":
      return (await import("./it")).messages;
    case "fr":
      return (await import("./fr")).messages;
    case "pt":
      return (await import("./pt")).messages;
    case "zh":
      return (await import("./zh")).messages;
    case "ja":
      return (await import("./ja")).messages;
    default:
      return (await import("./en")).messages;
  }
}
