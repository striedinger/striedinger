import { createTranslator, type Locale } from "@workspace/i18n";
import { cache } from "react";

import { loadMtaMessages } from "./load-messages";

const getCachedMtaTranslator = cache(createMtaTranslator);

export function getMtaTranslator(locale: Locale) {
  return getCachedMtaTranslator(locale);
}

async function createMtaTranslator(locale: Locale) {
  return createTranslator(await loadMtaMessages(locale));
}
