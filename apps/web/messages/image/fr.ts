import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "Image Optimizer": "Optimiseur d’images",
  "Compress images privately in your browser. Nothing is uploaded.":
    "Compressez les images en privé dans votre navigateur. Aucun fichier n’est envoyé.",
};
