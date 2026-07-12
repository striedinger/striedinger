import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages = {
  "Daily Sudoku": "Sudoku diario",
  "Play a fresh daily Sudoku puzzle with easy, medium, and hard levels. Track your time and share your result as an image.":
    "Juega un nuevo sudoku diario en nivel fácil, medio o difícil. Cronometra tu tiempo y comparte el resultado como imagen.",
  "Choose a level": "Elige un nivel",
  Easy: "Fácil",
  Medium: "Medio",
  Hard: "Difícil",
  Date: "Fecha",
  Time: "Tiempo",
  "Sudoku puzzle": "Sudoku",
  "Number pad": "Teclado numérico",
  Erase: "Borrar",
  "Ready for today's puzzle?": "¿Listo para el sudoku de hoy?",
  "Start puzzle": "Comenzar",
  "Restart puzzle": "Reiniciar sudoku",
  "Restart this puzzle?": "¿Reiniciar este sudoku?",
  "Your current progress and time will be cleared.": "Se borrarán tu progreso y tiempo actuales.",
  Cancel: "Cancelar",
  Restart: "Reiniciar",
  Score: "Puntuación",
  "Inputs: {count} · minimum: {minimum}": "Entradas: {count} · mínimo: {minimum}",
  "Row {row}, column {column}, empty": "Fila {row}, columna {column}, vacía",
  "Row {row}, column {column}, {value}": "Fila {row}, columna {column}, {value}",
  "Puzzle complete!": "¡Sudoku completado!",
  "Share result": "Compartir resultado",
  "Creating image": "Creando imagen",
  "Result shared.": "Resultado compartido.",
  "Sharing is unavailable, so the result image was downloaded instead.":
    "No se puede compartir, así que se descargó la imagen del resultado.",
  "The result image could not be created. Please try again.":
    "No se pudo crear la imagen del resultado. Inténtalo de nuevo.",
} satisfies TranslationCatalog<typeof englishMessages>;
