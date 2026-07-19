import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "Add files": "Ajouter des fichiers",
  "Files in this session": "Fichiers de cette session",
  "Link copied": "Lien copié",
  "Could not copy the link. Copy the room code instead.":
    "Impossible de copier le lien. Copiez plutôt le code du salon.",
  "Copy invite link": "Copier le lien d’invitation",
  "Sent directly": "Envoyé directement",
  Download: "Télécharger",
  "Drop to share": "Déposez pour partager",
  "Drop files here": "Déposez les fichiers ici",
  "End-to-end encrypted": "Chiffré de bout en bout",
  "1 file": "1 fichier",
  "Received file failed its integrity check": "Le contrôle d’intégrité du fichier a échoué",
  "Larger than the 100 MB browser limit": "Dépasse la limite de 100 Mo du navigateur",
  "{count} files": "{count} fichiers",
  Join: "Rejoindre",
  "Have a room code?": "Vous avez un code de salon ?",
  "Enter the complete 16-character room code.":
    "Saisissez le code complet du salon à 16 caractères.",
  "Files you select or receive will appear here.":
    "Les fichiers sélectionnés ou reçus apparaîtront ici.",
  "Waiting for another device": "En attente d’un autre appareil",
  "1 device connected": "1 appareil connecté",
  "{count} devices connected": "{count} appareils connectés",
  "Preparing…": "Préparation…",
  "Files stay in your browser until a device connects. Up to 100 MB each.":
    "Les fichiers restent dans votre navigateur jusqu’à la connexion d’un appareil. 100 Mo maximum chacun.",
  "Your room": "Votre salon",
  "A direct connection could not be established. Try another network or browser.":
    "Impossible d’établir une connexion directe. Essayez un autre réseau ou navigateur.",
  Retry: "Réessayer",
  "Select files": "Sélectionner des fichiers",
  Sending: "Envoi en cours",
  "Share invite": "Partager l’invitation",
  "Send the private link or room code to another device.":
    "Envoyez le lien privé ou le code du salon à un autre appareil.",
  "Transfer failed": "Échec du transfert",
  "Ready to send": "Prêt à envoyer",
};
