import type { Locale } from "@workspace/i18n";

import { createTranslator } from "@workspace/i18n";
import { cache } from "react";

import { loadListeningMessages } from "./load-messages";

export const getListeningTranslator = cache(async function getListeningTranslator(locale: Locale) {
  return createTranslator(await loadListeningMessages(locale));
});
