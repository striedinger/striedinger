import { defineMessages, type TranslationCatalog } from "@workspace/i18n";
import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "JSON Validator and Formatter": "Validador e formatador de JSON",
  "Validate, format, and explore JSON entirely in your browser. Your data never leaves this device.":
    "Valide, formate e explore JSON inteiramente no navegador. Seus dados nunca saem deste dispositivo.",
  "JSON input": "Entrada JSON",
  "Your JSON stays in this browser and is never sent to the server.":
    "Seu JSON permanece neste navegador e nunca é enviado ao servidor.",
  "Paste JSON here": "Cole o JSON aqui",
  "Valid JSON": "JSON válido",
  "Invalid JSON: {error}": "JSON inválido: {error}",
  Preview: "Prévia",
  "Expand all": "Expandir tudo",
  "Collapse all": "Recolher tudo",
  "Expand value": "Expandir valor",
  "Collapse value": "Recolher valor",
  "Enter valid JSON to see an expandable preview.":
    "Insira um JSON válido para ver uma prévia expansível.",
});
