import type { Metadata } from "next";

import { Suspense } from "react";

import type { SudokuLabels } from "./types";

import { JsonLd } from "../../../components/json-ld";
import { createPageMetadata, createWebApplicationStructuredData } from "../../../lib/seo";
import { getSudokuTranslator } from "../../../messages/sudoku/get-translator";
import { getRequestLocale } from "../../get-request-locale";
import { SudokuGameLoader } from "./sudoku-game-loader";
import { SudokuGameSkeleton } from "./sudoku-game-skeleton";
import { SudokuScreen } from "./sudoku-screen";

const descriptionKey =
  "Play a fresh daily Sudoku puzzle with easy, medium, and hard levels. Track your time and share your result as an image." as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getSudokuTranslator(locale);
  const title = translate("Daily Sudoku Puzzles");
  const description = translate(descriptionKey);

  return createPageMetadata({ title, description, locale, path: "/sudoku" });
}

export default async function SudokuPage() {
  const locale = await getRequestLocale();
  const translate = await getSudokuTranslator(locale);
  const privacyDescription = translate(
    "Puzzle progress and the timer stay in this browser. No account or server save is required.",
  );
  const labels: SudokuLabels = {
    cancel: translate("Cancel"),
    cellEmpty: translate("Row {row}, column {column}, empty"),
    cellValue: translate("Row {row}, column {column}, {value}"),
    chooseDifficulty: translate("Choose a level"),
    completed: translate("Puzzle complete!"),
    date: translate("Date"),
    description: translate(descriptionKey),
    difficulty: {
      easy: translate("Easy"),
      medium: translate("Medium"),
      hard: translate("Hard"),
    },
    erase: translate("Erase"),
    numberPad: translate("Number pad"),
    puzzle: translate("Sudoku puzzle"),
    restart: translate("Restart puzzle"),
    restartConfirm: translate("Restart"),
    restartDescription: translate("Your current progress and time will be cleared."),
    restartTitle: translate("Restart this puzzle?"),
    score: translate("Score"),
    scoreInputs: translate("Inputs: {count} · minimum: {minimum}"),
    share: translate("Share result"),
    shareDownloaded: translate(
      "Sharing is unavailable, so the result image was downloaded instead.",
    ),
    shareError: translate("The result image could not be created. Please try again."),
    shared: translate("Result shared."),
    sharing: translate("Creating image"),
    start: translate("Start puzzle"),
    startPrompt: translate("Ready for today's puzzle?"),
    time: translate("Time"),
    title: translate("Daily Sudoku"),
  };
  const structuredData = createWebApplicationStructuredData({
    name: labels.title,
    description: labels.description,
    applicationCategory: "GameApplication",
    browserRequirements: "Requires JavaScript",
    featureList: [labels.description, labels.chooseDifficulty, privacyDescription, labels.share],
    locale,
    path: "/sudoku",
  });

  return (
    <SudokuScreen title={labels.title}>
      <JsonLd value={structuredData} />
      <Suspense fallback={<SudokuGameSkeleton />}>
        <SudokuGameLoader labels={labels} locale={locale} />
      </Suspense>
    </SudokuScreen>
  );
}
