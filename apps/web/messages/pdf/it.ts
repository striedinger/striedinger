import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "PDF Optimizer": "Ottimizzatore PDF",
  "PDF Compressor and Optimizer": "Compressore e ottimizzatore PDF",
  "Compress, preview, and remove PDF restrictions entirely in your browser.":
    "Comprimi, visualizza e rimuovi le restrizioni dei PDF interamente nel browser.",
  Balanced: "Bilanciato",
  "Choose PDF": "Scegli PDF",
  "Compress PDF": "Comprimi PDF",
  "Compression mode": "Modalità di compressione",
  Download: "Scarica",
  "Drop PDF to start": "Rilascia il PDF per iniziare",
  "Drop a PDF here": "Rilascia qui un PDF",
  "This PDF is locked. Enter its password to preview it.":
    "Questo PDF è bloccato. Inserisci la password per visualizzarlo.",
  "Your PDF stays on this device.": "Il tuo PDF resta su questo dispositivo.",
  "That password did not open this PDF.": "Questa password non ha aperto il PDF.",
  "Rendering preview": "Creazione dell’anteprima",
  "Lossless rewrite": "Riscrittura senza perdita",
  "The original was already smaller": "L’originale era già più piccolo",
  "Open PDF": "Apri PDF",
  pages: "pagine",
  "PDF password": "Password del PDF",
  "Enter a password you are authorized to use. It is never stored.":
    "Inserisci una password che sei autorizzato a usare. Non viene mai salvata.",
  Preview: "Anteprima",
  "Preparing PDF": "Preparazione del PDF",
  Quality: "Qualità",
  "Remove restrictions": "Rimuovi restrizioni",
  "Choose another": "Scegli un altro",
  "Optimized PDF": "PDF ottimizzato",
  smaller: "più piccolo",
  "Smallest file": "File più piccolo",
  "One PDF at a time · processed locally": "Un PDF alla volta · elaborato in locale",
  "Restrictions removed": "Restrizioni rimosse",
  "This PDF could not be opened in your browser.": "Impossibile aprire questo PDF nel browser.",
  Close: "Chiudi",
  "Copy Summary": "Copia riepilogo",
  "This PDF has no text to summarize, such as a scanned document.":
    "Questo PDF non contiene testo da riassumere, come nel caso di un documento scansionato.",
  "Summarize Document": "Riassumi documento",
  "Summary Copied": "Riepilogo copiato",
  "Key Points": "Punti chiave",
};
