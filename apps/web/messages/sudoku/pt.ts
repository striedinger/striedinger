import type { TranslationCatalog } from "@workspace/i18n";

import type { messages as englishMessages } from "./en";

export const messages = {
  "Daily Sudoku": "Sudoku diário",
  "Play a fresh daily Sudoku puzzle with easy, medium, and hard levels. Track your time and share your result as an image.":
    "Jogue um novo Sudoku diário nos níveis fácil, médio ou difícil. Cronometre seu tempo e compartilhe o resultado como imagem.",
  "Choose a level": "Escolha um nível",
  Easy: "Fácil",
  Medium: "Médio",
  Hard: "Difícil",
  Date: "Data",
  Time: "Tempo",
  "Sudoku puzzle": "Sudoku",
  "Number pad": "Teclado numérico",
  Erase: "Apagar",
  "Ready for today's puzzle?": "Pronto para o Sudoku de hoje?",
  "Start puzzle": "Começar",
  "Restart puzzle": "Reiniciar Sudoku",
  "Restart this puzzle?": "Reiniciar este Sudoku?",
  "Your current progress and time will be cleared.": "Seu progresso e tempo atuais serão apagados.",
  Cancel: "Cancelar",
  Restart: "Reiniciar",
  Score: "Pontuação",
  "Inputs: {count} · minimum: {minimum}": "Entradas: {count} · mínimo: {minimum}",
  "Row {row}, column {column}, empty": "Linha {row}, coluna {column}, vazia",
  "Row {row}, column {column}, {value}": "Linha {row}, coluna {column}, {value}",
  "Puzzle complete!": "Sudoku concluído!",
  "Share result": "Compartilhar resultado",
  "Creating image": "Criando imagem",
  "Result shared.": "Resultado compartilhado.",
  "Sharing is unavailable, so the result image was downloaded instead.":
    "O compartilhamento não está disponível; a imagem do resultado foi baixada.",
  "The result image could not be created. Please try again.":
    "Não foi possível criar a imagem do resultado. Tente novamente.",
} satisfies TranslationCatalog<typeof englishMessages>;
