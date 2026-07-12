import { defineMessages, type TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "JSON Validator and Formatter": "Validatore e formattatore JSON",
  "Validate, format, and explore JSON entirely in your browser. Your data never leaves this device.":
    "Valida, formatta ed esplora JSON interamente nel browser. I tuoi dati non lasciano mai questo dispositivo.",
  "JSON input": "Input JSON",
  "Your JSON stays in this browser and is never sent to the server.":
    "Il tuo JSON rimane in questo browser e non viene mai inviato al server.",
  "Paste JSON here": "Incolla qui il JSON",
  "Valid JSON": "JSON valido",
  "Invalid JSON: {error}": "JSON non valido: {error}",
  Preview: "Anteprima",
  "Expand all": "Espandi tutto",
  "Collapse all": "Comprimi tutto",
  "Expand value": "Espandi valore",
  "Collapse value": "Comprimi valore",
  "Enter valid JSON to see an expandable preview.":
    "Inserisci JSON valido per vedere un’anteprima espandibile.",
  "This JSON is too large to process safely in the browser.":
    "Questo JSON è troppo grande per essere elaborato in sicurezza nel browser.",
  "This JSON is valid but too complex to preview all at once.":
    "Questo JSON è valido, ma troppo complesso per mostrarne subito l’anteprima completa.",
});
