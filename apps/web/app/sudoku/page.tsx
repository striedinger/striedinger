import type { Metadata } from "next";

import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Suspense } from "react";

import type { SudokuLabels } from "./types";

import { JsonLd } from "../../components/json-ld";
import { getSudokuTranslator } from "../../messages/sudoku/get-translator";
import { getRequestLocale } from "../get-request-locale";
import { SudokuGameLoader } from "./sudoku-game-loader";
import { SudokuGameSkeleton } from "./sudoku-game-skeleton";

const descriptionKey =
  "Play a fresh daily Sudoku puzzle with easy, medium, and hard levels. Track your time and share your result as an image." as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getSudokuTranslator(locale);
  const title = translate("Daily Sudoku");
  const description = translate(descriptionKey);

  return {
    title,
    description,
    alternates: { canonical: "/sudoku" },
    openGraph: {
      type: "website",
      url: "/sudoku",
      locale,
      siteName: "Hugo Striedinger",
      title,
      description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      creator: "@striedinger",
      title,
      description,
      images: ["/opengraph-image"],
    },
    robots: { index: true, follow: true },
  };
}

export default async function SudokuPage() {
  const locale = await getRequestLocale();
  const translate = await getSudokuTranslator(locale);
  const date = new Date().toISOString().slice(0, 10);
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
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: labels.title,
    description: labels.description,
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    url: "https://striedinger.co/sudoku",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <PageShell className="py-6 sm:py-14">
      <JsonLd value={structuredData} />
      <PageContainer>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 sm:gap-14">
          <PageHeader title={labels.title} description={labels.description} variant="compact" />

          <Suspense fallback={<SudokuGameSkeleton />}>
            <SudokuGameLoader date={date} labels={labels} locale={locale} />
          </Suspense>
        </div>
      </PageContainer>
    </PageShell>
  );
}
