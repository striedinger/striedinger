import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "IP Address Information": "Informations sur l’adresse IP",
  "See the public IP address, approximate request location, and HTTP information visible to this website.":
    "Consultez l’adresse IP publique, l’emplacement approximatif de la requête et les informations HTTP visibles par ce site.",
  "The server reports the address and request metadata it receives from your connection.":
    "Le serveur affiche l’adresse et les métadonnées de requête qu’il reçoit de votre connexion.",
  "This page does not use a third-party IP lookup service. Approximate location is shown only when the hosting platform provides it.":
    "Cette page n’utilise aucun service tiers de recherche d’IP. L’emplacement approximatif n’est affiché que si l’hébergeur le fournit.",
  "Loading request details…": "Chargement des détails de la requête…",
  "Observed IP Address": "Adresse IP observée",
  "IP address": "Adresse IP",
  "IP version": "Version IP",
  "Request Location": "Emplacement de la requête",
  "Location values are approximate and may identify a network exit point instead of your physical location.":
    "Les valeurs d’emplacement sont approximatives et peuvent indiquer un point de sortie réseau plutôt que votre position physique.",
  Country: "Pays",
  Region: "Région",
  City: "Ville",
  "Time zone": "Fuseau horaire",
  Latitude: "Latitude",
  Longitude: "Longitude",
  "Request Details": "Détails de la requête",
  Protocol: "Protocole",
  Host: "Hôte",
  "Forwarded addresses": "Adresses transférées",
  "HTTP Request Headers": "En-têtes de la requête HTTP",
  "Only privacy-safe request headers are displayed. Cookies, authorization values, and internal identifiers are excluded.":
    "Seuls les en-têtes respectueux de la vie privée sont affichés. Les cookies, autorisations et identifiants internes sont exclus.",
  "WebRTC Leak Test": "Test de fuite WebRTC",
  "This optional test contacts Cloudflare's public STUN server and lists the ICE addresses exposed by your browser.":
    "Ce test facultatif contacte le serveur STUN public de Cloudflare et répertorie les adresses ICE exposées par votre navigateur.",
  "Run WebRTC test": "Lancer le test WebRTC",
  "Testing…": "Test en cours…",
  "Candidate type": "Type de candidat",
  Address: "Adresse",
  "No ICE candidates were exposed.": "Aucun candidat ICE n’a été exposé.",
  "WebRTC is not supported by this browser.": "WebRTC n’est pas pris en charge par ce navigateur.",
  "The WebRTC test could not complete.": "Le test WebRTC n’a pas pu se terminer.",
  Unavailable: "Indisponible",
};
