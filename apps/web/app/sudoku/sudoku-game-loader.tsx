import { cacheLife } from "next/cache";

import type { SudokuLabels } from "./types";

import { createDailyPuzzle } from "./sudoku";
import { SudokuGame } from "./sudoku-game";

interface SudokuGameLoaderProps {
  date: string;
  labels: SudokuLabels;
  locale: string;
}

export async function SudokuGameLoader({ date, labels, locale }: SudokuGameLoaderProps) {
  const puzzles = await getDailyPuzzles(date);
  return <SudokuGame labels={labels} locale={locale} puzzles={puzzles} />;
}

async function getDailyPuzzles(date: string) {
  "use cache";
  cacheLife("days");
  return {
    easy: createDailyPuzzle(date, "easy"),
    medium: createDailyPuzzle(date, "medium"),
    hard: createDailyPuzzle(date, "hard"),
  };
}
