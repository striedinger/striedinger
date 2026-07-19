import type { Locale } from "@workspace/i18n";

import { createTranslator } from "@workspace/i18n";
import { cache } from "react";

import { loadStocksMessages } from "./load-messages";

export const getStocksTranslator = cache(async function getStocksTranslator(locale: Locale) {
  return createTranslator(await loadStocksMessages(locale));
});
