import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "Add files": "Dateien hinzufügen",
  "Files in this session": "Dateien in dieser Sitzung",
  "Link copied": "Link kopiert",
  "Could not copy the link. Copy the room code instead.":
    "Der Link konnte nicht kopiert werden. Kopiere stattdessen den Raumcode.",
  "Copy invite link": "Einladungslink kopieren",
  "Sent directly": "Direkt gesendet",
  Download: "Herunterladen",
  "Drop to share": "Zum Teilen ablegen",
  "Drop files here": "Dateien hier ablegen",
  "End-to-end encrypted": "Ende-zu-Ende-verschlüsselt",
  "1 file": "1 Datei",
  "Received file failed its integrity check": "Integritätsprüfung der Datei fehlgeschlagen",
  "Larger than the 100 MB browser limit": "Größer als das Browserlimit von 100 MB",
  "{count} files": "{count} Dateien",
  Join: "Beitreten",
  "Have a room code?": "Hast du einen Raumcode?",
  "Enter the complete 16-character room code.": "Gib den vollständigen 16-stelligen Raumcode ein.",
  "Files you select or receive will appear here.":
    "Ausgewählte oder empfangene Dateien erscheinen hier.",
  "Waiting for another device": "Warten auf ein anderes Gerät",
  "1 device connected": "1 Gerät verbunden",
  "{count} devices connected": "{count} Geräte verbunden",
  "Preparing…": "Wird vorbereitet…",
  "Files stay in your browser until a device connects. Up to 100 MB each.":
    "Dateien bleiben im Browser, bis sich ein Gerät verbindet. Jeweils bis zu 100 MB.",
  "Your room": "Dein Raum",
  "A direct connection could not be established. Try another network or browser.":
    "Eine direkte Verbindung konnte nicht hergestellt werden. Versuche ein anderes Netzwerk oder einen anderen Browser.",
  Retry: "Erneut versuchen",
  "Select files": "Dateien auswählen",
  Sending: "Wird gesendet",
  "Share invite": "Einladung teilen",
  "Send the private link or room code to another device.":
    "Sende den privaten Link oder Raumcode an ein anderes Gerät.",
  "Transfer failed": "Übertragung fehlgeschlagen",
  "Ready to send": "Bereit zum Senden",
};
