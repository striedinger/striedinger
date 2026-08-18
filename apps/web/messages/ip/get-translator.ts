import { composeCatalogs, createTranslator, type Locale } from "@workspace/i18n";
import { cache } from "react";

import { loadMessages } from "../load-messages";
import { loadIpMessages } from "./load-messages";

const getCachedIpTranslator = cache(createIpTranslator);

export function getIpTranslator(locale: Locale) {
  return getCachedIpTranslator(locale);
}

async function createIpTranslator(locale: Locale) {
  const [webMessages, ipMessages] = await Promise.all([
    loadMessages(locale),
    loadIpMessages(locale),
  ]);
  return createTranslator(composeCatalogs(webMessages, ipMessages));
}
