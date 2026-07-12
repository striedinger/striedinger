import { defineMessages, type TranslationCatalog } from "@workspace/i18n";
import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "JSON Validator and Formatter": "Validateur et formateur JSON",
  "Validate, format, and explore JSON entirely in your browser. Your data never leaves this device.":
    "Validez, formatez et explorez du JSON entièrement dans votre navigateur. Vos données ne quittent jamais cet appareil.",
  "JSON input": "Entrée JSON",
  "Your JSON stays in this browser and is never sent to the server.":
    "Votre JSON reste dans ce navigateur et n’est jamais envoyé au serveur.",
  "Paste JSON here": "Collez le JSON ici",
  "Valid JSON": "JSON valide",
  "Invalid JSON: {error}": "JSON invalide : {error}",
  Preview: "Aperçu",
  "Expand all": "Tout développer",
  "Collapse all": "Tout réduire",
  "Expand value": "Développer la valeur",
  "Collapse value": "Réduire la valeur",
  "Enter valid JSON to see an expandable preview.":
    "Saisissez un JSON valide pour afficher un aperçu développable.",
});
