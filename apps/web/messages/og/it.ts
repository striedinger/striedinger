import type { TranslationCatalog } from "@workspace/i18n";
import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "Open Graph Preview": "Anteprima Open Graph",
  "Enter any public URL to inspect its Open Graph and X metadata, preview its social cards, and review the tags found in the page.":
    "Inserisci un URL pubblico per esaminare i metadati Open Graph e X, vedere le schede social e controllare i tag trovati.",
  "URL to preview": "URL da visualizzare",
  "https://example.com": "https://esempio.it",
  "Preview cards": "Mostra anteprima",
  "Previewing {url} ({duration} ms)": "Anteprima di {url} ({duration} ms)",
  "Checking…": "Verifica in corso…",
  "Only public HTTP(S) pages on standard ports are fetched. Private networks, local addresses, credentials, oversized responses, and unsafe redirects are blocked.":
    "Vengono richieste solo pagine HTTP(S) pubbliche su porte standard. Reti private, indirizzi locali, credenziali, risposte eccessive e reindirizzamenti non sicuri sono bloccati.",
  "Social card previews": "Anteprime delle schede social",
  "Open Graph preview": "Anteprima Open Graph",
  "X / Twitter card preview": "Anteprima scheda X / Twitter",
  "From": "Da",
  "Detected metadata": "Metadati rilevati",
  "All usable meta tags, document title, and canonical URL found in the page head.":
    "Tutti i meta tag utilizzabili, il titolo del documento e l’URL canonico trovati nell’intestazione della pagina.",
  "Enter a valid absolute URL, including http:// or https://.":
    "Inserisci un URL assoluto valido che includa http:// o https://.",
  "That address is not allowed. Private, local, and non-standard network targets are blocked.":
    "Questo indirizzo non è consentito. Le destinazioni private, locali e non standard sono bloccate.",
  "That page could not be reached within the allowed time.":
    "La pagina non è stata raggiunta entro il tempo consentito.",
  "The response was not an HTML page.": "La risposta non era una pagina HTML.",
  "The HTML response was too large to inspect safely.":
    "La risposta HTML era troppo grande per essere esaminata in sicurezza.",
  "No usable social metadata was found on that page.":
    "Nella pagina non sono stati trovati metadati social utilizzabili.",
  "Too many previews were requested. Please wait a minute and try again.":
    "Sono state richieste troppe anteprime. Attendi un minuto e riprova.",
  "Preview Open Graph and X cards for any public URL. Inspect titles, descriptions, images, and raw social metadata with a fast, secure online tester.":
    "Visualizza le schede Open Graph e X per qualsiasi URL pubblico. Controlla titoli, descrizioni, immagini e metadati social in modo rapido e sicuro.",
  "Test Open Graph and X metadata": "Verifica i metadati Open Graph e X",
  "Check how a public page may appear when shared, including its title, description, preview image, site name, card type, and detected social tags.":
    "Controlla come può apparire una pagina pubblica quando viene condivisa, inclusi titolo, descrizione, immagine, sito, tipo di scheda e tag social.",
};
