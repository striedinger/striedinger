import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";
export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "PDF Optimizer": "PDF 优化器",
  "PDF Compressor and Optimizer": "PDF 压缩与优化工具",
};
