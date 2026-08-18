import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "JavaScript Browser Information": "Informazioni JavaScript del browser",
  "Inspect the JavaScript, screen, navigator, media, network, and storage information exposed by your browser.":
    "Esamina le informazioni su JavaScript, schermo, navigatore, contenuti multimediali, rete e archiviazione esposte dal browser.",
  "Everything shown here is read locally in your browser and is not uploaded or stored.":
    "Tutto ciò che viene mostrato è letto localmente nel browser e non viene caricato né archiviato.",
  "Values are collected after the page loads and may change when browser permissions, windows, displays, or network conditions change.":
    "I valori vengono raccolti dopo il caricamento e possono cambiare con permessi, finestre, schermi o condizioni di rete.",
  "JavaScript is disabled, so browser details cannot be collected.":
    "JavaScript è disattivato, quindi non è possibile raccogliere i dettagli del browser.",
  "Collecting browser details…": "Raccolta dei dettagli del browser…",
  "Refresh details": "Aggiorna dettagli",
  Unavailable: "Non disponibile",
  Supported: "Supportato",
  "Not supported": "Non supportato",
  Enabled: "Attivato",
  "JavaScript and Document": "JavaScript e documento",
  "Screen and Window": "Schermo e finestra",
  "Date, Time, and Internationalization": "Data, ora e internazionalizzazione",
  Navigator: "Navigatore",
  "User-Agent Client Hints": "Client Hints dello user agent",
  "Plugins and MIME Types": "Plugin e tipi MIME",
  "Battery and Network": "Batteria e rete",
  "Media and Device APIs": "API multimediali e del dispositivo",
  "Storage APIs": "API di archiviazione",
  "Additional Navigator Properties": "Proprietà aggiuntive del navigatore",
};
