import type { Metadata } from "next";

import { createPageMetadata } from "../../../lib/seo";
import { getNotesTranslator } from "../../../messages/notes/get-translator";
import { getRequestLocale } from "../../get-request-locale";

/**
 * Folders and notes exist only in the visitor's browser, so their URLs share the app's
 * metadata, point search engines at the app, and stay out of indexes.
 */
export async function createPrivateNotesMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getNotesTranslator(locale);
  return {
    ...createPageMetadata({
      title: translate("Notes"),
      description: translate(
        "Capture ideas with rich text, checklists, and photos. Your notes stay on this device.",
      ),
      locale,
      path: "/notes",
    }),
    robots: { index: false, follow: false },
  };
}
