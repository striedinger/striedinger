import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "Add files": "Aggiungi file",
  "Files in this session": "File in questa sessione",
  "Link copied": "Link copiato",
  "Could not copy the link. Copy the room code instead.":
    "Impossibile copiare il link. Copia invece il codice della stanza.",
  "Copy invite link": "Copia link di invito",
  "Sent directly": "Inviato direttamente",
  Download: "Scarica",
  "Drop to share": "Rilascia per condividere",
  "Drop files here": "Rilascia qui i file",
  "End-to-end encrypted": "Crittografia end-to-end",
  "1 file": "1 file",
  "Received file failed its integrity check": "Il file ricevuto non ha superato il controllo",
  "Larger than the 100 MB browser limit": "Supera il limite di 100 MB del browser",
  "{count} files": "{count} file",
  Join: "Entra",
  "Have a room code?": "Hai un codice stanza?",
  "Enter the complete 16-character room code.":
    "Inserisci il codice stanza completo di 16 caratteri.",
  "Files you select or receive will appear here.": "I file selezionati o ricevuti appariranno qui.",
  "Waiting for another device": "In attesa di un altro dispositivo",
  "1 device connected": "1 dispositivo connesso",
  "{count} devices connected": "{count} dispositivi connessi",
  "Preparing…": "Preparazione…",
  "Files stay in your browser until a device connects. Up to 100 MB each.":
    "I file rimangono nel browser finché non si connette un dispositivo. Massimo 100 MB ciascuno.",
  "Your room": "La tua stanza",
  "A direct connection could not be established. Try another network or browser.":
    "Impossibile stabilire una connessione diretta. Prova un’altra rete o un altro browser.",
  Retry: "Riprova",
  "Select files": "Seleziona file",
  Sending: "Invio in corso",
  "Share invite": "Condividi invito",
  "Send the private link or room code to another device.":
    "Invia il link privato o il codice stanza a un altro dispositivo.",
  "Transfer failed": "Trasferimento non riuscito",
  "Ready to send": "Pronto per l’invio",
};
