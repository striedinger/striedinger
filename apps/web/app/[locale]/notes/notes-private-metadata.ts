import type { Metadata } from "next";

import { getNotesTranslator } from "../../../messages/notes/get-translator";
import { getRequestLocale } from "../../get-request-locale";

/** Folders and notes exist only in the visitor's browser, so their URLs stay out of indexes. */
export async function createPrivateNotesMetadata(): Promise<Metadata> {
  const translate = await getNotesTranslator(await getRequestLocale());
  return { title: translate("Notes"), robots: { index: false, follow: false } };
}
