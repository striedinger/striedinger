import type { Viewport } from "next";
import type { ReactNode } from "react";

import { Suspense } from "react";

import { IosAppFrame } from "../../../components/ios/ios-app-frame";
import { notesFrameClassName } from "./notes-frame";
import { NotesLoader } from "./notes-loader";
import { NotesSkeleton } from "./notes-skeleton";

export const viewport: Viewport = {
  viewportFit: "cover",
  // Browsers that support it shrink the layout above the keyboard instead of covering it.
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

interface NotesLayoutProps {
  children: ReactNode;
}

/**
 * Notes keeps every note in this browser, so its folders, lists, editor, and toolbars live in
 * this layout and stay mounted while the folder and note routes below change.
 */
export default function NotesLayout({ children }: NotesLayoutProps) {
  return (
    <IosAppFrame className={notesFrameClassName}>
      {/* The open folder and note come from the URL, which is only known per request. */}
      <Suspense fallback={<NotesSkeleton />}>
        <NotesLoader />
      </Suspense>
      {children}
    </IosAppFrame>
  );
}
