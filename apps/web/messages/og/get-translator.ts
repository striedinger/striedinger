import { composeCatalogs, createTranslator, type Locale } from "@workspace/i18n";
import { loadMessages } from "../load-messages";
import { loadOgMessages } from "./load-messages";

export async function getOgTranslator(locale: Locale) {
  const [webMessages, ogMessages] = await Promise.all([
    loadMessages(locale),
    loadOgMessages(locale),
  ]);

  return createTranslator(composeCatalogs(webMessages, ogMessages));
}
