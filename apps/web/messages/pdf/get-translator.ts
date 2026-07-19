import { composeCatalogs, createTranslator, type Locale } from "@workspace/i18n";
import { cache } from "react";

import { loadMessages } from "../load-messages";
import { loadPdfMessages } from "./load-messages";

const getCachedPdfTranslator = cache(createPdfTranslator);

export function getPdfTranslator(locale: Locale) {
  return getCachedPdfTranslator(locale);
}

async function createPdfTranslator(locale: Locale) {
  const [webMessages, pdfMessages] = await Promise.all([
    loadMessages(locale),
    loadPdfMessages(locale),
  ]);
  return createTranslator(composeCatalogs(webMessages, pdfMessages));
}
