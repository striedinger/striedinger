import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";
export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "PDF Optimizer": "PDF-Optimierer",
};
