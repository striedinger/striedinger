import { composeCatalogs, createTranslator, type Locale } from "@workspace/i18n";
import { cache } from "react";

import { loadMessages } from "../load-messages";
import { loadJsonMessages } from "./load-messages";

const getCachedJsonTranslator = cache(createJsonTranslator);

export function getJsonTranslator(locale: Locale) {
  return getCachedJsonTranslator(locale);
}

async function createJsonTranslator(locale: Locale) {
  const [webMessages, jsonMessages] = await Promise.all([
    loadMessages(locale),
    loadJsonMessages(locale),
  ]);

  return createTranslator(composeCatalogs(webMessages, jsonMessages));
}
