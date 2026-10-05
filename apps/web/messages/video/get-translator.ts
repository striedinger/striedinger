import { composeCatalogs, createTranslator, type Locale } from "@workspace/i18n";
import { cache } from "react";

import { loadMessages } from "../load-messages";
import { loadVideoMessages } from "./load-messages";

const getCachedVideoTranslator = cache(createVideoTranslator);

export function getVideoTranslator(locale: Locale) {
  return getCachedVideoTranslator(locale);
}

async function createVideoTranslator(locale: Locale) {
  const [webMessages, videoMessages] = await Promise.all([
    loadMessages(locale),
    loadVideoMessages(locale),
  ]);

  return createTranslator(composeCatalogs(webMessages, videoMessages));
}
