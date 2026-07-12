import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages = {
  "Daily Sudoku": "Sudoku du jour",
  "Play a fresh daily Sudoku puzzle with easy, medium, and hard levels. Track your time and share your result as an image.":
    "Jouez chaque jour à un nouveau Sudoku facile, moyen ou difficile. Chronométrez-vous et partagez votre résultat en image.",
  "Choose a level": "Choisissez un niveau",
  Easy: "Facile",
  Medium: "Moyen",
  Hard: "Difficile",
  Date: "Date",
  Time: "Temps",
  "Sudoku puzzle": "Grille de Sudoku",
  "Number pad": "Pavé numérique",
  Erase: "Effacer",
  "Ready for today's puzzle?": "Prêt pour le Sudoku du jour ?",
  "Start puzzle": "Commencer",
  "Restart puzzle": "Recommencer le Sudoku",
  "Restart this puzzle?": "Recommencer ce Sudoku ?",
  "Your current progress and time will be cleared.":
    "Votre progression et votre temps seront effacés.",
  Cancel: "Annuler",
  Restart: "Recommencer",
  Score: "Score",
  "Inputs: {count} · minimum: {minimum}": "Saisies : {count} · minimum : {minimum}",
  "Row {row}, column {column}, empty": "Ligne {row}, colonne {column}, vide",
  "Row {row}, column {column}, {value}": "Ligne {row}, colonne {column}, {value}",
  "Puzzle complete!": "Sudoku terminé !",
  "Share result": "Partager le résultat",
  "Creating image": "Création de l’image",
  "Result shared.": "Résultat partagé.",
  "Sharing is unavailable, so the result image was downloaded instead.":
    "Le partage est indisponible, l’image du résultat a donc été téléchargée.",
  "The result image could not be created. Please try again.":
    "Impossible de créer l’image du résultat. Veuillez réessayer.",
} satisfies TranslationCatalog<typeof englishMessages>;
