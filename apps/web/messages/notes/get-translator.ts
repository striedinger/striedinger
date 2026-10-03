import { createTranslator, type Locale } from "@workspace/i18n";
import { cache } from "react";

import { loadNotesMessages } from "./load-messages";

export const getNotesTranslator = cache(async function getNotesTranslator(locale: Locale) {
  return createTranslator(await loadNotesMessages(locale));
});
