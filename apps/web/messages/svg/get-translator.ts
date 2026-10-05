import { composeCatalogs, createTranslator, type Locale } from "@workspace/i18n";
import { cache } from "react";

import { loadMessages } from "../load-messages";
import { loadSvgMessages } from "./load-messages";

const getCachedSvgTranslator = cache(createSvgTranslator);

export function getSvgTranslator(locale: Locale) {
  return getCachedSvgTranslator(locale);
}

async function createSvgTranslator(locale: Locale) {
  const [webMessages, svgMessages] = await Promise.all([
    loadMessages(locale),
    loadSvgMessages(locale),
  ]);

  return createTranslator(composeCatalogs(webMessages, svgMessages));
}
