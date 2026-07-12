import { composeCatalogs, createTranslator, type Locale } from "@workspace/i18n";
import { cache } from "react";

import { loadMessages } from "../load-messages";
import { loadOgMessages } from "./load-messages";

const getCachedOgTranslator = cache(createOgTranslator);

export function getOgTranslator(locale: Locale) {
  return getCachedOgTranslator(locale);
}

async function createOgTranslator(locale: Locale) {
  const [webMessages, ogMessages] = await Promise.all([
    loadMessages(locale),
    loadOgMessages(locale),
  ]);

  return createTranslator(composeCatalogs(webMessages, ogMessages));
}
