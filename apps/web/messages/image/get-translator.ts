import { composeCatalogs, createTranslator, type Locale } from "@workspace/i18n";
import { cache } from "react";

import { loadMessages } from "../load-messages";
import { loadImageMessages } from "./load-messages";

const getCachedImageTranslator = cache(createImageTranslator);

export function getImageTranslator(locale: Locale) {
  return getCachedImageTranslator(locale);
}

async function createImageTranslator(locale: Locale) {
  const [webMessages, imageMessages] = await Promise.all([
    loadMessages(locale),
    loadImageMessages(locale),
  ]);
  return createTranslator(composeCatalogs(webMessages, imageMessages));
}
