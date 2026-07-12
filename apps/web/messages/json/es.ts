import { defineMessages, type TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "JSON Validator and Formatter": "Validador y formateador de JSON",
  "Validate, format, and explore JSON entirely in your browser. Your data never leaves this device.":
    "Valida, formatea y explora JSON completamente en tu navegador. Tus datos nunca salen de este dispositivo.",
  "JSON input": "Entrada JSON",
  "Your JSON stays in this browser and is never sent to the server.":
    "Tu JSON permanece en este navegador y nunca se envía al servidor.",
  "Paste JSON here": "Pega el JSON aquí",
  "Valid JSON": "JSON válido",
  "Invalid JSON: {error}": "JSON no válido: {error}",
  Preview: "Vista previa",
  "Expand all": "Expandir todo",
  "Collapse all": "Contraer todo",
  "Expand value": "Expandir valor",
  "Collapse value": "Contraer valor",
  "Enter valid JSON to see an expandable preview.":
    "Introduce JSON válido para ver una vista previa expandible.",
  "This JSON is too large to process safely in the browser.":
    "Este JSON es demasiado grande para procesarlo de forma segura en el navegador.",
  "This JSON is valid but too complex to preview all at once.":
    "Este JSON es válido, pero demasiado complejo para previsualizarlo completo de una vez.",
});
