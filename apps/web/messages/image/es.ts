import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "Image Optimizer": "Optimizador de imágenes",
  "Compress images privately in your browser. Nothing is uploaded.":
    "Comprime imágenes de forma privada en tu navegador. No se sube nada.",
};
