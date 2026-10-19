import { cacheLife } from "next/cache";
import { connection } from "next/server";

import type { SudokuLabels } from "./types";

import { createDailyPuzzle } from "./sudoku";
import { SudokuGame } from "./sudoku-game";

interface SudokuGameLoaderProps {
  labels: SudokuLabels;
  locale: string;
}

/** Today's puzzles, chosen at request time so the rest of the page can be prerendered. */
export async function SudokuGameLoader({ labels, locale }: SudokuGameLoaderProps) {
  await connection();
  // oxlint-disable-next-line react-hooks-js/purity -- Server component; runs once per request.
  const date = new Date().toISOString().slice(0, 10);
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
