import { composeCatalogs, createTranslator, type Locale } from "@workspace/i18n";
import { loadMessages } from "../load-messages";
import { loadJsonMessages } from "./load-messages";

export async function getJsonTranslator(locale: Locale) {
  const [webMessages, jsonMessages] = await Promise.all([
    loadMessages(locale),
    loadJsonMessages(locale),
  ]);

  return createTranslator(composeCatalogs(webMessages, jsonMessages));
}
