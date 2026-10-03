import { loadNotesMessages } from "../../../messages/notes/load-messages";
import { getRequestLocale } from "../../get-request-locale";
import { NotesApp } from "./notes-app";

/** Notes in the visitor's language, with a welcome note written in it. */
export async function NotesLoader() {
  const locale = await getRequestLocale();
  const messages = await loadNotesMessages(locale);
  return (
    <NotesApp
      locale={locale}
      messages={messages}
      welcomeNoteHtml={createWelcomeNoteHtml(messages)}
    />
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
