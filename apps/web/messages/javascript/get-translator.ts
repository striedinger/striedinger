import { composeCatalogs, createTranslator, type Locale } from "@workspace/i18n";
import { cache } from "react";

import { loadMessages } from "../load-messages";
import { loadJavaScriptMessages } from "./load-messages";

const getCachedJavaScriptTranslator = cache(createJavaScriptTranslator);

export function getJavaScriptTranslator(locale: Locale) {
  return getCachedJavaScriptTranslator(locale);
}

async function createJavaScriptTranslator(locale: Locale) {
  const [webMessages, javaScriptMessages] = await Promise.all([
    loadMessages(locale),
    loadJavaScriptMessages(locale),
  ]);
  return createTranslator(composeCatalogs(webMessages, javaScriptMessages));
}
