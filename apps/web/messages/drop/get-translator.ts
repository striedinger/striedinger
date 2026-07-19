import { composeCatalogs, createTranslator, type Locale } from "@workspace/i18n";
import { cache } from "react";

import { loadMessages } from "../load-messages";
import { loadDropMessages } from "./load-messages";

const getCachedDropTranslator = cache(createDropTranslator);

export function getDropTranslator(locale: Locale) {
  return getCachedDropTranslator(locale);
}

async function createDropTranslator(locale: Locale) {
  const [webMessages, dropMessages] = await Promise.all([
    loadMessages(locale),
    loadDropMessages(locale),
  ]);
  return createTranslator(composeCatalogs(webMessages, dropMessages));
}
