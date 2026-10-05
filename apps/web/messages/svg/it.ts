import { defineMessages, type TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "SVG Editor": "Editor SVG",
  "SVG Viewer, Editor, and Optimizer": "Visualizzatore, editor e ottimizzatore SVG",
  "Edit SVG code with a live preview, then optimize it or export it as a PNG. Everything stays in your browser.":
    "Modifica il codice SVG con anteprima dal vivo, poi ottimizzalo o esportalo come PNG. Tutto resta nel tuo browser.",
  "SVG code": "Codice SVG",
  "Paste SVG code here": "Incolla qui il codice SVG",
  Preview: "Anteprima",
  "Valid SVG": "SVG valido",
  "Invalid SVG: {error}": "SVG non valido: {error}",
  "This document is not an SVG image.": "Questo documento non è un'immagine SVG.",
  "This SVG is too large to edit safely in the browser.":
    "Questo SVG è troppo grande per essere modificato in sicurezza nel browser.",
  "Enter valid SVG code to see a preview.": "Inserisci codice SVG valido per vedere un'anteprima.",
  "Your SVG stays in this browser and is never sent to the server.":
    "Il tuo SVG resta in questo browser e non viene mai inviato al server.",
  Background: "Sfondo",
  Grid: "Griglia",
  Light: "Chiaro",
  Dark: "Scuro",
  Open: "Apri",
  Optimize: "Ottimizza",
  Copy: "Copia",
  Copied: "Copiato",
  "Download SVG": "Scarica SVG",
  "Export PNG": "Esporta PNG",
  "Optimized from {before} to {after}.": "Ottimizzato da {before} a {after}.",
  "This SVG is already optimized.": "Questo SVG è già ottimizzato.",
  "This SVG could not be optimized.": "Impossibile ottimizzare questo SVG.",
  "This file could not be opened as an SVG.": "Impossibile aprire questo file come SVG.",
  "This SVG could not be exported as a PNG.": "Impossibile esportare questo SVG come PNG.",
  Dimensions: "Dimensioni",
  "File size": "Dimensione file",
  Elements: "Elementi",
  "SVG actions": "Azioni SVG",
  Details: "Dettagli",
  Share: "Condividi",
});
