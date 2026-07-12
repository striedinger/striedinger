import type { TranslationCatalog } from "@workspace/i18n";
import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "Open Graph Preview": "Open-Graph-Vorschau",
  "Enter any public URL to inspect its Open Graph and X metadata, preview its social cards, and review the tags found in the page.":
    "Gib eine öffentliche URL ein, um ihre Open-Graph- und X-Metadaten, Kartenansichten und gefundenen Tags zu prüfen.",
  "URL to preview": "URL für die Vorschau",
  "https://example.com": "https://beispiel.de",
  "Preview cards": "Karten anzeigen",
  "Previewing {url} ({duration} ms)": "Vorschau für {url} ({duration} ms)",
  "Checking…": "Wird geprüft…",
  "Only public HTTP(S) pages on standard ports are fetched. Private networks, local addresses, credentials, oversized responses, and unsafe redirects are blocked.":
    "Es werden nur öffentliche HTTP(S)-Seiten auf Standardports abgerufen. Private Netze, lokale Adressen, Zugangsdaten, zu große Antworten und unsichere Weiterleitungen werden blockiert.",
  "Social card previews": "Vorschau sozialer Karten",
  "Open Graph preview": "Open-Graph-Vorschau",
  "X / Twitter card preview": "X-/Twitter-Kartenvorschau",
  "From": "Von",
  "Detected metadata": "Erkannte Metadaten",
  "All usable meta tags, document title, and canonical URL found in the page head.":
    "Alle verwendbaren Meta-Tags, der Dokumenttitel und die kanonische URL aus dem Seitenkopf.",
  "Enter a valid absolute URL, including http:// or https://.":
    "Gib eine gültige absolute URL einschließlich http:// oder https:// ein.",
  "That address is not allowed. Private, local, and non-standard network targets are blocked.":
    "Diese Adresse ist nicht erlaubt. Private, lokale und nicht standardmäßige Netzwerkziele werden blockiert.",
  "That page could not be reached within the allowed time.":
    "Die Seite konnte innerhalb der zulässigen Zeit nicht erreicht werden.",
  "The response was not an HTML page.": "Die Antwort war keine HTML-Seite.",
  "The HTML response was too large to inspect safely.":
    "Die HTML-Antwort war für eine sichere Prüfung zu groß.",
  "No usable social metadata was found on that page.":
    "Auf dieser Seite wurden keine verwendbaren Social-Metadaten gefunden.",
  "Too many previews were requested. Please wait a minute and try again.":
    "Es wurden zu viele Vorschauen angefordert. Bitte warte eine Minute und versuche es erneut.",
  "Preview Open Graph and X cards for any public URL. Inspect titles, descriptions, images, and raw social metadata with a fast, secure online tester.":
    "Zeige Open-Graph- und X-Karten für jede öffentliche URL an. Prüfe Titel, Beschreibungen, Bilder und Social-Metadaten schnell und sicher.",
  "Test Open Graph and X metadata": "Open-Graph- und X-Metadaten testen",
  "Check how a public page may appear when shared, including its title, description, preview image, site name, card type, and detected social tags.":
    "Prüfe, wie eine öffentliche Seite beim Teilen erscheinen kann, einschließlich Titel, Beschreibung, Vorschaubild, Website, Kartentyp und Social-Tags.",
};
