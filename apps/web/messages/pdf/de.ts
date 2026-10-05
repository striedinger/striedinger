import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "PDF Optimizer": "PDF-Optimierer",
  "PDF Compressor and Optimizer": "PDF-Kompressor und -Optimierer",
  "Compress, preview, and remove PDF restrictions entirely in your browser.":
    "PDFs komprimieren, ansehen und Einschränkungen entfernen – vollständig im Browser.",
  Balanced: "Ausgewogen",
  "Choose PDF": "PDF auswählen",
  "Compress PDF": "PDF komprimieren",
  "Compression mode": "Komprimierungsmodus",
  Download: "Herunterladen",
  "Drop PDF to start": "PDF zum Starten ablegen",
  "Drop a PDF here": "PDF hier ablegen",
  "This PDF is locked. Enter its password to preview it.":
    "Dieses PDF ist gesperrt. Gib das Passwort ein, um es anzusehen.",
  "Your PDF stays on this device.": "Dein PDF bleibt auf diesem Gerät.",
  "That password did not open this PDF.": "Mit diesem Passwort ließ sich das PDF nicht öffnen.",
  "Rendering preview": "Vorschau wird erstellt",
  "Lossless rewrite": "Verlustfrei neu schreiben",
  "The original was already smaller": "Das Original war bereits kleiner",
  "Open PDF": "PDF öffnen",
  pages: "Seiten",
  "PDF password": "PDF-Passwort",
  "Enter a password you are authorized to use. It is never stored.":
    "Gib ein Passwort ein, das du verwenden darfst. Es wird nie gespeichert.",
  Preview: "Vorschau",
  "Preparing PDF": "PDF wird vorbereitet",
  Quality: "Qualität",
  "Remove restrictions": "Einschränkungen entfernen",
  "Choose another": "Andere auswählen",
  "Optimized PDF": "Optimiertes PDF",
  smaller: "kleiner",
  "Smallest file": "Kleinste Datei",
  "One PDF at a time · processed locally": "Ein PDF nach dem anderen · lokal verarbeitet",
  "Restrictions removed": "Einschränkungen entfernt",
  "This PDF could not be opened in your browser.":
    "Dieses PDF konnte im Browser nicht geöffnet werden.",
  Close: "Schließen",
  "Copy Summary": "Zusammenfassung kopieren",
  "This PDF has no text to summarize, such as a scanned document.":
    "Dieses PDF enthält keinen Text zum Zusammenfassen, etwa bei einem gescannten Dokument.",
  "Summarize Document": "Dokument zusammenfassen",
  "Summary Copied": "Zusammenfassung kopiert",
  "Key Points": "Kernpunkte",
};
