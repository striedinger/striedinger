import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages = {
  "Daily Sudoku": "Sudoku giornaliero",
  "Play a fresh daily Sudoku puzzle with easy, medium, and hard levels. Track your time and share your result as an image.":
    "Gioca ogni giorno un nuovo Sudoku facile, medio o difficile. Cronometra il tempo e condividi il risultato come immagine.",
  "Choose a level": "Scegli un livello",
  Easy: "Facile",
  Medium: "Medio",
  Hard: "Difficile",
  Date: "Data",
  Time: "Tempo",
  "Sudoku puzzle": "Sudoku",
  "Number pad": "Tastierino numerico",
  Erase: "Cancella",
  "Ready for today's puzzle?": "Pronto per il Sudoku di oggi?",
  "Start puzzle": "Inizia",
  "Restart puzzle": "Ricomincia il Sudoku",
  "Restart this puzzle?": "Ricominciare questo Sudoku?",
  "Your current progress and time will be cleared.":
    "I progressi e il tempo attuali verranno cancellati.",
  Cancel: "Annulla",
  Restart: "Ricomincia",
  Score: "Punteggio",
  "Inputs: {count} · minimum: {minimum}": "Inserimenti: {count} · minimo: {minimum}",
  "Row {row}, column {column}, empty": "Riga {row}, colonna {column}, vuota",
  "Row {row}, column {column}, {value}": "Riga {row}, colonna {column}, {value}",
  "Puzzle complete!": "Sudoku completato!",
  "Share result": "Condividi risultato",
  "Creating image": "Creazione immagine",
  "Result shared.": "Risultato condiviso.",
  "Sharing is unavailable, so the result image was downloaded instead.":
    "La condivisione non è disponibile, quindi l’immagine del risultato è stata scaricata.",
  "The result image could not be created. Please try again.":
    "Impossibile creare l’immagine del risultato. Riprova.",
} satisfies TranslationCatalog<typeof englishMessages>;
