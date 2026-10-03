import type { Metadata, Viewport } from "next";

import { Suspense } from "react";

import { IosAppFrame } from "../../../components/ios/ios-app-frame";
import { iosFallbackFont } from "../../../components/ios/ios-font";
import { JsonLd } from "../../../components/json-ld";
import { createPageMetadata, createWebApplicationStructuredData } from "../../../lib/seo";
import { getNotesTranslator } from "../../../messages/notes/get-translator";
import { loadNotesMessages } from "../../../messages/notes/load-messages";
import { getRequestLocale } from "../../get-request-locale";
import { NotesApp } from "./notes-app";
import { NotesSkeleton } from "./notes-skeleton";

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

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

export default function NotesPage() {
  return (
    <IosAppFrame
      className={`${iosFallbackFont.variable} [--ios-tint:#e1a400] dark:[--ios-tint:#ffd60a]`}
    >
      <Suspense fallback={<NotesSkeleton />}>
        <LocalizedNotesApp />
      </Suspense>
    </IosAppFrame>
  );
}

async function LocalizedNotesApp() {
  const locale = await getRequestLocale();
  const messages = await loadNotesMessages(locale);
  const description =
    messages[
      "Capture ideas with rich text, checklists, and photos. Your notes stay on this device."
    ];
  const structuredData = createWebApplicationStructuredData({
    name: messages.Notes,
    description,
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

  return (
    <>
      <JsonLd value={structuredData} />
      <NotesApp
        locale={locale}
        messages={messages}
        welcomeNoteHtml={createWelcomeNoteHtml(messages)}
      />
    </>
  );
}

function createWelcomeNoteHtml(messages: Awaited<ReturnType<typeof loadNotesMessages>>) {
  return [
    `<h1>${escapeHtml(messages["Welcome to Notes"])}</h1>`,
    `<p>${escapeHtml(messages["Jot down ideas, make checklists, and add photos. Everything stays on this device."])}</p>`,
    `<ul data-type="checklist">`,
    `<li data-checked="true">${escapeHtml(messages["Tap Aa to style text"])}</li>`,
    `<li data-checked="false">${escapeHtml(messages["Add a checklist from the toolbar"])}</li>`,
    `<li data-checked="false">${escapeHtml(messages["Swipe a note in the list to pin, move, or delete it"])}</li>`,
    `</ul>`,
  ].join("");
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
