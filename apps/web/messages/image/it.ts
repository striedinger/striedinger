import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "Image Optimizer": "Ottimizzatore di immagini",
  "Image Compressor and Optimizer": "Compressore e ottimizzatore di immagini",
  "Compress images privately in your browser. Nothing is uploaded.":
    "Comprimi immagini privatamente nel browser. Nulla viene caricato.",
  "Add more": "Aggiungi altre",
  Auto: "Auto",
  "Auto size target": "Obiettivo dimensione automatico",
  Balanced: "Bilanciato",
  Optimizing: "Ottimizzazione",
  "Choose files": "Scegli file",
  "Clear all": "Cancella tutto",
  Download: "Scarica",
  "Download all": "Scarica tutto",
  "Drop files to start": "Rilascia i file per iniziare",
  "Drop images here": "Rilascia qui le immagini",
  "Could not optimize": "Impossibile ottimizzare",
  "Image format": "Formato immagine",
  "Maximum dimension": "Dimensione massima",
  Original: "Originale",
  "Resize the longest side, in pixels.": "Ridimensiona il lato più lungo, in pixel.",
  "Preparing file": "Preparazione del file",
  "Decoding image": "Decodifica dell'immagine",
  "Trying smaller formats": "Prova di formati più leggeri",
  "Checking visual quality": "Verifica della qualità visiva",
  "Compression mode": "Modalità di compressione",
  "Files stay on this device. Processing happens entirely in your browser.":
    "I file restano su questo dispositivo. L'elaborazione avviene interamente nel browser.",
  Quality: "Qualità",
  "Lower values create smaller files.": "Valori più bassi creano file più piccoli.",
  Lossless: "Senza perdita",
  Files: "File",
  Remove: "Rimuovi",
  smaller: "più piccolo",
  "No smaller result at this quality": "Nessun risultato più piccolo con questa qualità",
  "Smallest file": "File più piccolo",
  "HEIC, HEIF, JPEG, PNG, WebP, AVIF, GIF, SVG, and BMP · up to 20 files":
    "HEIC, HEIF, JPEG, PNG, WebP, AVIF, GIF, SVG e BMP · fino a 20 file",
  "You can optimize up to 20 files at once.": "Puoi ottimizzare fino a 20 file alla volta.",
  "One or more files use a format this browser cannot process.":
    "Uno o più file usano un formato che questo browser non può elaborare.",
};
