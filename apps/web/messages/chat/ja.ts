import { defineMessages, type TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "{name} via {peer}": "{name}（{peer} 経由）",
});
