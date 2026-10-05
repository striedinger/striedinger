import { defineMessages, type TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "SVG Editor": "SVG-Editor",
  "SVG Viewer, Editor, and Optimizer": "SVG-Viewer, -Editor und -Optimierer",
  "Edit SVG code with a live preview, then optimize it or export it as a PNG. Everything stays in your browser.":
    "Bearbeite SVG-Code mit Live-Vorschau und optimiere ihn oder exportiere ihn als PNG. Alles bleibt in deinem Browser.",
  "SVG code": "SVG-Code",
  "Paste SVG code here": "SVG-Code hier einfügen",
  Preview: "Vorschau",
  "Valid SVG": "Gültiges SVG",
  "Invalid SVG: {error}": "Ungültiges SVG: {error}",
  "This document is not an SVG image.": "Dieses Dokument ist kein SVG-Bild.",
  "This SVG is too large to edit safely in the browser.":
    "Dieses SVG ist zu groß, um es sicher im Browser zu bearbeiten.",
  "Enter valid SVG code to see a preview.": "Gib gültigen SVG-Code ein, um eine Vorschau zu sehen.",
  "Your SVG stays in this browser and is never sent to the server.":
    "Dein SVG bleibt in diesem Browser und wird nie an den Server gesendet.",
  Background: "Hintergrund",
  Grid: "Raster",
  Light: "Hell",
  Dark: "Dunkel",
  Open: "Öffnen",
  Optimize: "Optimieren",
  Copy: "Kopieren",
  Copied: "Kopiert",
  "Download SVG": "SVG herunterladen",
  "Export PNG": "PNG exportieren",
  "Optimized from {before} to {after}.": "Von {before} auf {after} optimiert.",
  "This SVG is already optimized.": "Dieses SVG ist bereits optimiert.",
  "This SVG could not be optimized.": "Dieses SVG konnte nicht optimiert werden.",
  "This file could not be opened as an SVG.": "Diese Datei konnte nicht als SVG geöffnet werden.",
  "This SVG could not be exported as a PNG.": "Dieses SVG konnte nicht als PNG exportiert werden.",
  Dimensions: "Abmessungen",
  "File size": "Dateigröße",
  Elements: "Elemente",
  "SVG actions": "SVG-Aktionen",
});
