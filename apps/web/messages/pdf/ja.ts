import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";
export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "PDF Optimizer": "PDF 最適化",
  "PDF Compressor and Optimizer": "PDF 圧縮・最適化ツール",
};
