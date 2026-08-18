import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "IP Address Information": "Informazioni sull’indirizzo IP",
  "See the public IP address, approximate request location, and HTTP information visible to this website.":
    "Visualizza l’indirizzo IP pubblico, la posizione approssimativa della richiesta e le informazioni HTTP visibili a questo sito.",
  "The server reports the address and request metadata it receives from your connection.":
    "Il server mostra l’indirizzo e i metadati della richiesta ricevuti dalla tua connessione.",
  "This page does not use a third-party IP lookup service. Approximate location is shown only when the hosting platform provides it.":
    "Questa pagina non usa servizi esterni di ricerca IP. La posizione approssimativa viene mostrata solo se fornita dalla piattaforma di hosting.",
  "Loading request details…": "Caricamento dei dettagli della richiesta…",
  "Observed IP Address": "Indirizzo IP osservato",
  "IP address": "Indirizzo IP",
  "IP version": "Versione IP",
  "Request Location": "Posizione della richiesta",
  "Location values are approximate and may identify a network exit point instead of your physical location.":
    "I valori di posizione sono approssimativi e possono indicare un punto di uscita della rete anziché la posizione fisica.",
  Country: "Paese",
  Region: "Regione",
  City: "Città",
  "Time zone": "Fuso orario",
  Latitude: "Latitudine",
  Longitude: "Longitudine",
  "Request Details": "Dettagli della richiesta",
  Protocol: "Protocollo",
  Host: "Host",
  "Forwarded addresses": "Indirizzi inoltrati",
  "HTTP Request Headers": "Intestazioni della richiesta HTTP",
  "Only privacy-safe request headers are displayed. Cookies, authorization values, and internal identifiers are excluded.":
    "Vengono mostrate solo intestazioni sicure per la privacy. Cookie, autorizzazioni e identificatori interni sono esclusi.",
  "WebRTC Leak Test": "Test di perdita WebRTC",
  "This optional test contacts Cloudflare's public STUN server and lists the ICE addresses exposed by your browser.":
    "Questo test facoltativo contatta il server STUN pubblico di Cloudflare ed elenca gli indirizzi ICE esposti dal browser.",
  "Run WebRTC test": "Esegui test WebRTC",
  "Testing…": "Test in corso…",
  "Candidate type": "Tipo di candidato",
  Address: "Indirizzo",
  "No ICE candidates were exposed.": "Non sono stati esposti candidati ICE.",
  "WebRTC is not supported by this browser.": "WebRTC non è supportato da questo browser.",
  "The WebRTC test could not complete.": "Il test WebRTC non è stato completato.",
  Unavailable: "Non disponibile",
};
