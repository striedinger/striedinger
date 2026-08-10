import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "Image Optimizer": "画像最適化",
  "Image Compressor and Optimizer": "画像圧縮・最適化ツール",
  "Compress images privately in your browser. Nothing is uploaded.":
    "画像をブラウザ内で安全に圧縮します。アップロードは行いません。",
};
