import type { Metadata } from "next";

import { JsonLd } from "../../../components/json-ld";
import { createPageMetadata, createWebApplicationStructuredData } from "../../../lib/seo";
import { getNotesTranslator } from "../../../messages/notes/get-translator";
import { loadNotesMessages } from "../../../messages/notes/load-messages";
import { getRequestLocale } from "../../get-request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getNotesTranslator(locale);
  return createPageMetadata({
    title: translate("Notes"),
    description: translate(
      "Capture ideas with rich text, checklists, and photos. Your notes stay on this device.",
    ),
    locale,
    path: "/notes",
  });
}

/** The folder list. The Notes layout renders every screen; this route adds the app's metadata. */
export default async function NotesPage() {
  const locale = await getRequestLocale();
  const messages = await loadNotesMessages(locale);
  const structuredData = createWebApplicationStructuredData({
    name: messages.Notes,
    description:
      messages[
        "Capture ideas with rich text, checklists, and photos. Your notes stay on this device."
      ],
    applicationCategory: "ProductivityApplication",
    browserRequirements: "Requires JavaScript",
    featureList: [
      messages["Rich text formatting"],
      messages.Checklists,
      messages["Photo attachments"],
      messages.Folders,
      messages.Search,
    ],
    locale,
    path: "/notes",
  });

  return <JsonLd value={structuredData} />;
}
