import type { Metadata } from "next";

import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Suspense } from "react";

import type { SudokuLabels } from "./types";

import { JsonLd } from "../../components/json-ld";
import { ToolDetails } from "../../components/tool-details";
import { createPageMetadata, createWebApplicationStructuredData } from "../../lib/seo";
import { getSudokuTranslator } from "../../messages/sudoku/get-translator";
import { getRequestLocale } from "../get-request-locale";
import { SudokuGameLoader } from "./sudoku-game-loader";
import { SudokuGameSkeleton } from "./sudoku-game-skeleton";

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
  const date = new Date().toISOString().slice(0, 10);
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
    <PageShell className="py-6 sm:py-14">
      <JsonLd value={structuredData} />
      <PageContainer>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 sm:gap-14">
          <PageHeader title={labels.title} description={labels.description} variant="compact" />

          <Suspense fallback={<SudokuGameSkeleton />}>
            <SudokuGameLoader date={date} labels={labels} locale={locale} />
          </Suspense>
          <ToolDetails
            title={translate("About this tool")}
            description={labels.description}
            sections={[
              {
                title: translate("How it works"),
                description: labels.startPrompt,
                items: [labels.chooseDifficulty, labels.restart, labels.time],
              },
              {
                title: translate("Local storage"),
                description: privacyDescription,
              },
              {
                title: translate("Features"),
                description: labels.completed,
                items: [labels.score, labels.share, labels.date],
              },
            ]}
          />
        </div>
      </PageContainer>
    </PageShell>
  );
}
