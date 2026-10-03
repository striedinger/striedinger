import type { Metadata } from "next";

import { createPrivateNotesMetadata } from "../../notes-private-metadata";

export function generateMetadata(): Promise<Metadata> {
  return createPrivateNotesMetadata();
}

/** A note, rendered by the Notes layout from the URL. */
export default function NotePage() {
  return null;
}
