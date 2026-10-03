import type { Metadata } from "next";

import { createPrivateNotesMetadata } from "../notes-private-metadata";

export function generateMetadata(): Promise<Metadata> {
  return createPrivateNotesMetadata();
}

/** A folder's notes, rendered by the Notes layout from the URL. */
export default function NotesFolderPage() {
  return null;
}
