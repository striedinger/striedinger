import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "JavaScript Browser Information": "Informations JavaScript du navigateur",
  "Inspect the JavaScript, screen, navigator, media, network, and storage information exposed by your browser.":
    "Inspectez les informations JavaScript, d’écran, de navigateur, de média, de réseau et de stockage exposées par votre navigateur.",
  "Everything shown here is read locally in your browser and is not uploaded or stored.":
    "Toutes les informations affichées sont lues localement dans votre navigateur, sans envoi ni stockage.",
  "Values are collected after the page loads and may change when browser permissions, windows, displays, or network conditions change.":
    "Les valeurs sont recueillies après le chargement et peuvent changer avec les autorisations, fenêtres, écrans ou conditions réseau.",
  "JavaScript is disabled, so browser details cannot be collected.":
    "JavaScript est désactivé, les informations du navigateur ne peuvent donc pas être recueillies.",
  "Collecting browser details…": "Collecte des informations du navigateur…",
  "Refresh details": "Actualiser les informations",
  Unavailable: "Indisponible",
  Supported: "Pris en charge",
  "Not supported": "Non pris en charge",
  Enabled: "Activé",
  "JavaScript and Document": "JavaScript et document",
  "Screen and Window": "Écran et fenêtre",
  "Date, Time, and Internationalization": "Date, heure et internationalisation",
  Navigator: "Navigateur",
  "User-Agent Client Hints": "Indications client de l’agent utilisateur",
  "Plugins and MIME Types": "Extensions et types MIME",
  "Battery and Network": "Batterie et réseau",
  "Media and Device APIs": "API multimédias et de l’appareil",
  "Storage APIs": "API de stockage",
  "Additional Navigator Properties": "Propriétés supplémentaires du navigateur",
};
