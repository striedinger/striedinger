import { defineMessages, type TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "JSON Validator and Formatter": "JSON-Validator und -Formatierer",
  "Validate, format, and explore JSON entirely in your browser. Your data never leaves this device.":
    "Validiere, formatiere und erkunde JSON vollständig in deinem Browser. Deine Daten verlassen dieses Gerät nie.",
  "JSON input": "JSON-Eingabe",
  "Your JSON stays in this browser and is never sent to the server.":
    "Dein JSON bleibt in diesem Browser und wird nie an den Server gesendet.",
  "Paste JSON here": "JSON hier einfügen",
  "Valid JSON": "Gültiges JSON",
  "Invalid JSON: {error}": "Ungültiges JSON: {error}",
  Preview: "Vorschau",
  "Expand all": "Alle aufklappen",
  "Collapse all": "Alle zuklappen",
  "Expand value": "Wert aufklappen",
  "Collapse value": "Wert zuklappen",
  "Enter valid JSON to see an expandable preview.":
    "Gib gültiges JSON ein, um eine aufklappbare Vorschau zu sehen.",
  "This JSON is too large to process safely in the browser.":
    "Dieses JSON ist zu groß, um es sicher im Browser zu verarbeiten.",
  "This JSON is valid but too complex to preview all at once.":
    "Dieses JSON ist gültig, aber zu komplex für eine vollständige Vorschau auf einmal.",
});
