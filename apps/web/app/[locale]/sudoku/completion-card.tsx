"use client";

import { ShareUpIcon } from "@workspace/icons/share-up-icon";
import { Text } from "@workspace/ui/components/text";
import { useState } from "react";

import type { ShareOutcome } from "./share-result";
import type { SudokuDifficulty, SudokuLabels } from "./types";

interface CompletionCardProps {
  date: string;
  difficulty: SudokuDifficulty;
  elapsedTime: string;
  inputCount: number;
  labels: SudokuLabels;
  localizedDate: string;
  minimumInputCount: number;
  score: number;
}

type ShareState = "idle" | "sharing" | ShareOutcome | "error";

export function CompletionCard({
  date,
  difficulty,
  elapsedTime,
  inputCount,
  labels,
  localizedDate,
  minimumInputCount,
  score,
}: CompletionCardProps) {
  const [shareState, setShareState] = useState<ShareState>("idle");

  async function handleShare() {
    setShareState("sharing");

    try {
      const { shareSudokuResult } = await import("./share-result");
      const outcome = await shareSudokuResult({
        date,
        difficulty,
        elapsedTime,
        inputCount,
        labels,
        localizedDate,
        minimumInputCount,
        score,
      });
      setShareState(outcome);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setShareState("idle");
        return;
      }

      setShareState("error");
    }
  }

  const statusMessage = getStatusMessage(shareState, labels);

  return (
    <section
      aria-live="polite"
      className="bg-ios-grouped-cell/80 absolute inset-0 z-30 flex animate-in flex-col justify-center gap-[clamp(0.5rem,3cqh,1rem)] overflow-y-auto rounded-[22px] p-[clamp(1rem,5cqw,1.5rem)] backdrop-blur-[16px] duration-500 zoom-in-95 fade-in motion-reduce:animate-none"
    >
      <div className="flex flex-col gap-0.5">
        <Text as="h2" className="text-ios-title2 text-ios-label font-bold">
          {labels.completed}
        </Text>
        <Text className="text-ios-subheadline text-ios-secondary-label">
          {labels.difficulty[difficulty]} · {localizedDate}
        </Text>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-ios-grouped-background flex flex-col gap-0.5 rounded-[16px] px-3.5 py-2.5">
          <Text className="text-ios-footnote text-ios-secondary-label">{labels.time}</Text>
          <Text
            family="rounded"
            className="text-ios-label text-[clamp(22px,7cqw,34px)] leading-tight font-bold tabular-nums"
          >
            {elapsedTime}
          </Text>
        </div>
        <div className="bg-ios-grouped-background flex flex-col gap-0.5 rounded-[16px] px-3.5 py-2.5">
          <Text className="text-ios-footnote text-ios-secondary-label">{labels.score}</Text>
          <Text
            family="rounded"
            className="text-ios-tint text-[clamp(22px,7cqw,34px)] leading-tight font-bold tabular-nums"
          >
            {score}/100
          </Text>
        </div>
      </div>
      <Text className="text-ios-footnote text-ios-secondary-label">
        {labels.scoreInputs
          .replace("{count}", String(inputCount))
          .replace("{minimum}", String(minimumInputCount))}
      </Text>
      <button
        type="button"
        disabled={shareState === "sharing"}
        className="bg-ios-tint focus-visible:ring-ios-tint/50 flex h-[50px] shrink-0 items-center justify-center gap-2 rounded-full text-[17px] font-semibold tracking-[-0.43px] text-white outline-none focus-visible:ring-2 active:scale-[0.98] disabled:opacity-60 motion-safe:transition-transform [&_svg]:size-5"
        onClick={handleShare}
      >
        <ShareUpIcon />
        {shareState === "sharing" ? labels.sharing : labels.share}
      </button>
      {statusMessage ? (
        <Text
          className={
            shareState === "error"
              ? "text-ios-footnote text-ios-red"
              : "text-ios-footnote text-ios-secondary-label"
          }
        >
          {statusMessage}
        </Text>
      ) : null}
    </section>
  );
}

function getStatusMessage(shareState: ShareState, labels: SudokuLabels): string {
  switch (shareState) {
    case "shared":
      return labels.shared;
    case "downloaded":
      return labels.shareDownloaded;
    case "error":
      return labels.shareError;
    default:
      return "";
  }
}
