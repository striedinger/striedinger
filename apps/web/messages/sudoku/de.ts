import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages = {
  "Daily Sudoku": "Tägliches Sudoku",
  "Play a fresh daily Sudoku puzzle with easy, medium, and hard levels. Track your time and share your result as an image.":
    "Spiele täglich ein neues Sudoku in drei Schwierigkeitsstufen. Stoppe deine Zeit und teile dein Ergebnis als Bild.",
  "Choose a level": "Schwierigkeitsgrad wählen",
  Easy: "Leicht",
  Medium: "Mittel",
  Hard: "Schwer",
  Date: "Datum",
  Time: "Zeit",
  "Sudoku puzzle": "Sudoku-Rätsel",
  "Number pad": "Zahlenfeld",
  Erase: "Löschen",
  "Ready for today's puzzle?": "Bereit für das heutige Sudoku?",
  "Start puzzle": "Sudoku starten",
  "Restart puzzle": "Sudoku neu starten",
  "Restart this puzzle?": "Dieses Sudoku neu starten?",
  "Your current progress and time will be cleared.":
    "Dein aktueller Fortschritt und deine Zeit werden gelöscht.",
  Cancel: "Abbrechen",
  Restart: "Neu starten",
  Score: "Punktzahl",
  "Inputs: {count} · minimum: {minimum}": "Eingaben: {count} · Minimum: {minimum}",
  "Row {row}, column {column}, empty": "Zeile {row}, Spalte {column}, leer",
  "Row {row}, column {column}, {value}": "Zeile {row}, Spalte {column}, {value}",
  "Puzzle complete!": "Sudoku gelöst!",
  "Share result": "Ergebnis teilen",
  "Creating image": "Bild wird erstellt",
  "Result shared.": "Ergebnis geteilt.",
  "Sharing is unavailable, so the result image was downloaded instead.":
    "Teilen ist nicht verfügbar, daher wurde das Ergebnisbild heruntergeladen.",
  "The result image could not be created. Please try again.":
    "Das Ergebnisbild konnte nicht erstellt werden. Bitte versuche es erneut.",
} satisfies TranslationCatalog<typeof englishMessages>;
