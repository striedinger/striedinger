import { composeCatalogs, createTranslator, type Locale } from "@workspace/i18n";
import { cache } from "react";

import { loadMessages } from "../load-messages";
import { loadChatMessages } from "./load-messages";

const getCachedChatTranslator = cache(createChatTranslator);

export function getChatTranslator(locale: Locale) {
  return getCachedChatTranslator(locale);
}

async function createChatTranslator(locale: Locale) {
  const [webMessages, chatMessages] = await Promise.all([
    loadMessages(locale),
    loadChatMessages(locale),
  ]);

  return createTranslator(composeCatalogs(webMessages, chatMessages));
}
