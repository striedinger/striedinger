import { composeCatalogs, createTranslator, type Locale } from "@workspace/i18n";
import { cache } from "react";

import { loadMessages } from "../load-messages";
import { loadSudokuMessages } from "./load-messages";

const getCachedSudokuTranslator = cache(createSudokuTranslator);

export function getSudokuTranslator(locale: Locale) {
  return getCachedSudokuTranslator(locale);
}

async function createSudokuTranslator(locale: Locale) {
  const [webMessages, sudokuMessages] = await Promise.all([
    loadMessages(locale),
    loadSudokuMessages(locale),
  ]);

  return createTranslator(composeCatalogs(webMessages, sudokuMessages));
}
