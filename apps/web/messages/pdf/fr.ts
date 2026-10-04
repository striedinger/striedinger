import type { TranslationCatalog } from "@workspace/i18n";

import { messages as englishMessages } from "./en";

export const messages: TranslationCatalog<typeof englishMessages> = {
  ...englishMessages,
  "PDF Optimizer": "Optimiseur PDF",
  "PDF Compressor and Optimizer": "Compresseur et optimiseur PDF",
  "Compress, preview, and remove PDF restrictions entirely in your browser.":
    "Compressez, prévisualisez et supprimez les restrictions de vos PDF entièrement dans votre navigateur.",
  Balanced: "Équilibré",
  "Choose PDF": "Choisir un PDF",
  "Compress PDF": "Compresser le PDF",
  "Compression mode": "Mode de compression",
  Download: "Télécharger",
  "Drop PDF to start": "Déposez le PDF pour commencer",
  "Drop a PDF here": "Déposez un PDF ici",
  "This PDF is locked. Enter its password to preview it.":
    "Ce PDF est verrouillé. Saisissez son mot de passe pour le prévisualiser.",
  "Your PDF stays on this device.": "Votre PDF reste sur cet appareil.",
  "That password did not open this PDF.": "Ce mot de passe n’a pas ouvert ce PDF.",
  "Rendering preview": "Génération de l’aperçu",
  "Lossless rewrite": "Réécriture sans perte",
  "The original was already smaller": "L’original était déjà plus petit",
  "Open PDF": "Ouvrir le PDF",
  pages: "pages",
  "PDF password": "Mot de passe du PDF",
  "Enter a password you are authorized to use. It is never stored.":
    "Saisissez un mot de passe que vous êtes autorisé à utiliser. Il n’est jamais enregistré.",
  Preview: "Aperçu",
  "Preparing PDF": "Préparation du PDF",
  Quality: "Qualité",
  "Remove restrictions": "Supprimer les restrictions",
  "Choose another": "En choisir un autre",
  "Optimized PDF": "PDF optimisé",
  smaller: "plus petit",
  "Smallest file": "Fichier le plus petit",
  "One PDF at a time · processed locally": "Un PDF à la fois · traité localement",
  "Restrictions removed": "Restrictions supprimées",
  "This PDF could not be opened in your browser.":
    "Ce PDF n’a pas pu être ouvert dans votre navigateur.",
};
