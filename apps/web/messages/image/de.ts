import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "Image Optimizer": "Bildoptimierer",
  "Compress images privately in your browser. Nothing is uploaded.":
    "Bilder privat im Browser komprimieren. Es wird nichts hochgeladen.",
};
