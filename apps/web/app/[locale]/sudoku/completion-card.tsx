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
      className="flex animate-in flex-col gap-4 rounded-[22px] bg-(--ios-grouped-cell) p-5 duration-500 fade-in slide-in-from-bottom-4 motion-reduce:animate-none"
    >
      <div className="flex flex-col gap-0.5">
        <Text
          as="h2"
          className="text-[22px] leading-7 font-bold tracking-[0.35px] text-(--ios-label)"
        >
          {labels.completed}
        </Text>
        <Text className="text-[15px] leading-5 text-(--ios-secondary-label)">
          {labels.difficulty[difficulty]} · {localizedDate}
        </Text>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5 rounded-[16px] bg-(--ios-grouped-background) px-4 py-3">
          <Text className="text-[13px] leading-[18px] text-(--ios-secondary-label)">
            {labels.time}
          </Text>
          <Text
            family="rounded"
            className="text-[34px] leading-[41px] font-bold text-(--ios-label) tabular-nums"
          >
            {elapsedTime}
          </Text>
        </div>
        <div className="flex flex-col gap-0.5 rounded-[16px] bg-(--ios-grouped-background) px-4 py-3">
          <Text className="text-[13px] leading-[18px] text-(--ios-secondary-label)">
            {labels.score}
          </Text>
          <Text
            family="rounded"
            className="text-[34px] leading-[41px] font-bold text-(--ios-tint) tabular-nums"
          >
            {score}/100
          </Text>
        </div>
      </div>
      <Text className="text-[13px] leading-[18px] text-(--ios-secondary-label)">
        {labels.scoreInputs
          .replace("{count}", String(inputCount))
          .replace("{minimum}", String(minimumInputCount))}
      </Text>
      <button
        type="button"
        disabled={shareState === "sharing"}
        className="flex h-[50px] items-center justify-center gap-2 rounded-full bg-(--ios-tint) text-[17px] font-semibold tracking-[-0.43px] text-white outline-none focus-visible:ring-2 focus-visible:ring-(--ios-tint)/50 active:scale-[0.98] disabled:opacity-60 motion-safe:transition-transform [&_svg]:size-5"
        onClick={handleShare}
      >
        <ShareUpIcon />
        {shareState === "sharing" ? labels.sharing : labels.share}
      </button>
      {statusMessage ? (
        <Text
          className={
            shareState === "error"
              ? "text-[13px] leading-[18px] text-(--ios-red)"
              : "text-[13px] leading-[18px] text-(--ios-secondary-label)"
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
