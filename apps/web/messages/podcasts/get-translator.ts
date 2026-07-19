import { createTranslator, type Locale } from "@workspace/i18n";
import { cache } from "react";

import { loadPodcastMessages } from "./load-messages";

export const getPodcastTranslator = cache(async function getPodcastTranslator(locale: Locale) {
  return createTranslator(await loadPodcastMessages(locale));
});
