import { composeCatalogs, createTranslator, type Locale } from "@workspace/i18n";
import { loadMessages } from "./load-messages";

export async function getTranslator(locale: Locale) {
  const webMessages = await loadMessages(locale);
  const composedMessages = composeCatalogs(webMessages);

  return createTranslator(composedMessages);
}
