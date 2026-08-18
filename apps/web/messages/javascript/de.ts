import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "JavaScript Browser Information": "JavaScript-Browserinformationen",
  "Inspect the JavaScript, screen, navigator, media, network, and storage information exposed by your browser.":
    "Prüfe die von deinem Browser offengelegten JavaScript-, Bildschirm-, Navigator-, Medien-, Netzwerk- und Speicherinformationen.",
  "Everything shown here is read locally in your browser and is not uploaded or stored.":
    "Alles hier Angezeigte wird lokal in deinem Browser gelesen und weder hochgeladen noch gespeichert.",
  "Values are collected after the page loads and may change when browser permissions, windows, displays, or network conditions change.":
    "Die Werte werden nach dem Laden erfasst und können sich mit Berechtigungen, Fenstern, Anzeigen oder Netzwerkbedingungen ändern.",
  "JavaScript is disabled, so browser details cannot be collected.":
    "JavaScript ist deaktiviert, daher können keine Browserdetails erfasst werden.",
  "Collecting browser details…": "Browserdetails werden erfasst…",
  "Refresh details": "Details aktualisieren",
  Unavailable: "Nicht verfügbar",
  Supported: "Unterstützt",
  "Not supported": "Nicht unterstützt",
  Enabled: "Aktiviert",
  "JavaScript and Document": "JavaScript und Dokument",
  "Screen and Window": "Bildschirm und Fenster",
  "Date, Time, and Internationalization": "Datum, Uhrzeit und Internationalisierung",
  Navigator: "Navigator",
  "User-Agent Client Hints": "User-Agent Client Hints",
  "Plugins and MIME Types": "Plug-ins und MIME-Typen",
  "Battery and Network": "Akku und Netzwerk",
  "Media and Device APIs": "Medien- und Geräte-APIs",
  "Storage APIs": "Speicher-APIs",
  "Additional Navigator Properties": "Weitere Navigator-Eigenschaften",
};
