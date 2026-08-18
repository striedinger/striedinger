import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  "IP Address Information": "IP-Adressinformationen",
  "See the public IP address, approximate request location, and HTTP information visible to this website.":
    "Zeige die öffentliche IP-Adresse, den ungefähren Anfrageort und die für diese Website sichtbaren HTTP-Informationen an.",
  "The server reports the address and request metadata it receives from your connection.":
    "Der Server zeigt die Adresse und Anfragemetadaten an, die er von deiner Verbindung empfängt.",
  "This page does not use a third-party IP lookup service. Approximate location is shown only when the hosting platform provides it.":
    "Diese Seite verwendet keinen externen IP-Suchdienst. Ein ungefährer Ort wird nur angezeigt, wenn die Hosting-Plattform ihn bereitstellt.",
  "Loading request details…": "Anfragedetails werden geladen…",
  "Observed IP Address": "Beobachtete IP-Adresse",
  "IP address": "IP-Adresse",
  "IP version": "IP-Version",
  "Request Location": "Anfrageort",
  "Location values are approximate and may identify a network exit point instead of your physical location.":
    "Ortsangaben sind ungefähr und können einen Netzwerkausgangspunkt statt deines physischen Standorts bezeichnen.",
  Country: "Land",
  Region: "Region",
  City: "Stadt",
  "Time zone": "Zeitzone",
  Latitude: "Breitengrad",
  Longitude: "Längengrad",
  "Request Details": "Anfragedetails",
  Protocol: "Protokoll",
  Host: "Host",
  "Forwarded addresses": "Weitergeleitete Adressen",
  "HTTP Request Headers": "HTTP-Anfrageheader",
  "Only privacy-safe request headers are displayed. Cookies, authorization values, and internal identifiers are excluded.":
    "Es werden nur datenschutzfreundliche Header angezeigt. Cookies, Autorisierungswerte und interne Kennungen sind ausgeschlossen.",
  "WebRTC Leak Test": "WebRTC-Lecktest",
  "This optional test contacts Cloudflare's public STUN server and lists the ICE addresses exposed by your browser.":
    "Dieser optionale Test kontaktiert den öffentlichen STUN-Server von Cloudflare und listet die vom Browser offengelegten ICE-Adressen auf.",
  "Run WebRTC test": "WebRTC-Test starten",
  "Testing…": "Test läuft…",
  "Candidate type": "Kandidatentyp",
  Address: "Adresse",
  "No ICE candidates were exposed.": "Es wurden keine ICE-Kandidaten offengelegt.",
  "WebRTC is not supported by this browser.": "Dieser Browser unterstützt WebRTC nicht.",
  "The WebRTC test could not complete.": "Der WebRTC-Test konnte nicht abgeschlossen werden.",
  Unavailable: "Nicht verfügbar",
};
