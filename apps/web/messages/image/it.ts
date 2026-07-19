import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "Image Optimizer": "Ottimizzatore di immagini",
  "Compress images privately in your browser. Nothing is uploaded.":
    "Comprimi immagini privatamente nel browser. Nulla viene caricato.",
};
