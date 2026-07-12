import { composeCatalogs, createTranslator, type Locale } from "@workspace/i18n";
import { cache } from "react";

import { loadMessages } from "./load-messages";

const getCachedTranslator = cache(createWebTranslator);

export function getTranslator(locale: Locale) {
  return getCachedTranslator(locale);
}

async function createWebTranslator(locale: Locale) {
  const webMessages = await loadMessages(locale);
  const composedMessages = composeCatalogs(webMessages);

  return createTranslator(composedMessages);
}
