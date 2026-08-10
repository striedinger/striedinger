import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "Image Optimizer": "Otimizador de imagens",
  "Image Compressor and Optimizer": "Compressor e otimizador de imagens",
  "Compress images privately in your browser. Nothing is uploaded.":
    "Comprima imagens com privacidade no navegador. Nada é enviado.",
};
