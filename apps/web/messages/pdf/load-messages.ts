import type { Locale, TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export async function loadPdfMessages(
  locale: Locale,
): Promise<TranslationCatalog<typeof englishMessages>> {
  switch (locale) {
    case "de":
      return (await import("./de")).messages;
    case "es":
      return (await import("./es")).messages;
    case "fr":
      return (await import("./fr")).messages;
    case "it":
      return (await import("./it")).messages;
    case "ja":
      return (await import("./ja")).messages;
    case "pt":
      return (await import("./pt")).messages;
    case "zh":
      return (await import("./zh")).messages;
    default:
      return (await import("./en")).messages;
  }
}
