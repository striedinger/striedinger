import { defineMessages, type TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = defineMessages({
  "SVG Editor": "Éditeur SVG",
  "SVG Viewer, Editor, and Optimizer": "Visionneuse, éditeur et optimiseur SVG",
  "Edit SVG code with a live preview, then optimize it or export it as a PNG. Everything stays in your browser.":
    "Modifiez du code SVG avec un aperçu en direct, puis optimisez-le ou exportez-le en PNG. Tout reste dans votre navigateur.",
  "SVG code": "Code SVG",
  "Paste SVG code here": "Collez le code SVG ici",
  Preview: "Aperçu",
  "Valid SVG": "SVG valide",
  "Invalid SVG: {error}": "SVG non valide : {error}",
  "This document is not an SVG image.": "Ce document n’est pas une image SVG.",
  "This SVG is too large to edit safely in the browser.":
    "Ce SVG est trop volumineux pour être modifié en toute sécurité dans le navigateur.",
  "Enter valid SVG code to see a preview.": "Saisissez un code SVG valide pour afficher un aperçu.",
  "Your SVG stays in this browser and is never sent to the server.":
    "Votre SVG reste dans ce navigateur et n’est jamais envoyé au serveur.",
  Background: "Arrière-plan",
  Grid: "Grille",
  Light: "Clair",
  Dark: "Sombre",
  Open: "Ouvrir",
  Optimize: "Optimiser",
  Copy: "Copier",
  Copied: "Copié",
  "Download SVG": "Télécharger le SVG",
  "Export PNG": "Exporter en PNG",
  "Optimized from {before} to {after}.": "Optimisé de {before} à {after}.",
  "This SVG is already optimized.": "Ce SVG est déjà optimisé.",
  "This SVG could not be optimized.": "Impossible d’optimiser ce SVG.",
  "This file could not be opened as an SVG.": "Impossible d’ouvrir ce fichier en tant que SVG.",
  "This SVG could not be exported as a PNG.": "Impossible d’exporter ce SVG en PNG.",
  Dimensions: "Dimensions",
  "File size": "Taille du fichier",
  Elements: "Éléments",
  "SVG actions": "Actions SVG",
  Details: "Détails",
  Share: "Partager",
  Close: "Fermer",
  "Add Title and Description": "Ajouter un titre et une description",
  "Describe a change, like “make it blue”": "Décrivez une modification, comme « rends-le bleu »",
  "Apply Change": "Appliquer la modification",
  "Edit with On-Device AI": "Modifier avec l’IA sur l’appareil",
  Undo: "Annuler",
  "This SVG is too large to edit with on-device AI.":
    "Ce SVG est trop volumineux pour être modifié avec l’IA sur l’appareil.",
});
