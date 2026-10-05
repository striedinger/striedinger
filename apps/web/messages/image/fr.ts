import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "Image Optimizer": "Optimiseur d’images",
  "Image Compressor and Optimizer": "Compresseur et optimiseur d’images",
  "Compress images privately in your browser. Nothing is uploaded.":
    "Compressez les images en privé dans votre navigateur. Aucun fichier n’est envoyé.",
  "Add more": "Ajouter",
  Auto: "Auto",
  "Auto size target": "Objectif de taille automatique",
  Balanced: "Équilibré",
  Optimizing: "Optimisation",
  "Choose files": "Choisir des fichiers",
  "Clear all": "Tout effacer",
  Download: "Télécharger",
  "Download all": "Tout télécharger",
  "Drop files to start": "Déposez les fichiers pour commencer",
  "Drop images here": "Déposez des images ici",
  "Could not optimize": "Optimisation impossible",
  "Image format": "Format d’image",
  "Maximum dimension": "Dimension maximale",
  Original: "Originale",
  "Resize the longest side, in pixels.": "Redimensionne le plus grand côté, en pixels.",
  "Preparing file": "Préparation du fichier",
  "Decoding image": "Décodage de l’image",
  "Trying smaller formats": "Essai de formats plus légers",
  "Checking visual quality": "Vérification de la qualité visuelle",
  "Compression mode": "Mode de compression",
  "Files stay on this device. Processing happens entirely in your browser.":
    "Les fichiers restent sur cet appareil. Tout le traitement a lieu dans votre navigateur.",
  Quality: "Qualité",
  "Lower values create smaller files.": "Des valeurs plus basses créent des fichiers plus petits.",
  Lossless: "Sans perte",
  Files: "Fichiers",
  Remove: "Supprimer",
  smaller: "plus petit",
  "No smaller result at this quality": "Aucun résultat plus petit à cette qualité",
  "Smallest file": "Fichier le plus petit",
  "HEIC, HEIF, JPEG, PNG, WebP, AVIF, GIF, SVG, and BMP · up to 20 files":
    "HEIC, HEIF, JPEG, PNG, WebP, AVIF, GIF, SVG et BMP · jusqu’à 20 fichiers",
  "You can optimize up to 20 files at once.":
    "Vous pouvez optimiser jusqu’à 20 fichiers à la fois.",
  "One or more files use a format this browser cannot process.":
    "Un ou plusieurs fichiers utilisent un format que ce navigateur ne peut pas traiter.",
  Close: "Fermer",
  "Alt Text Copied": "Texte alternatif copié",
  "Copy Alt Text": "Copier le texte alternatif",
  Describe: "Décrire",
  "Description of {name}": "Description de {name}",
  Renamed: "Renommé",
  "Rename to “{name}”": "Renommer en « {name} »",
  "This image has no text to translate.": "Cette image ne contient aucun texte à traduire.",
  "Text in Image": "Texte dans l’image",
  "Translate Text in Image": "Traduire le texte de l’image",
};
