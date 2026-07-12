"use client";

import { Button } from "@workspace/ui/components/button";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import { useState } from "react";

import type { SudokuDifficulty, SudokuLabels } from "./types";

import { shareSudokuResult, type ShareOutcome } from "./share-result";

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
    <Surface as="section" className="flex flex-col gap-5 p-5 sm:p-6" aria-live="polite">
      <div className="flex flex-col gap-2">
        <Text as="h2" size="2xl" weight="semibold">
          {labels.completed}
        </Text>
        <Text tone="muted">
          {labels.difficulty[difficulty]} · {localizedDate}
        </Text>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <Text size="xs" tone="muted">
            {labels.time}
          </Text>
          <Text family="rounded" size="3xl" weight="bold" className="tracking-tight tabular-nums">
            {elapsedTime}
          </Text>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Text size="xs" tone="muted">
            {labels.score}
          </Text>
          <Text family="rounded" size="3xl" weight="bold" className="tracking-tight tabular-nums">
            {score}/100
          </Text>
        </div>
      </div>
      <Text size="sm" tone="muted">
        {labels.scoreInputs
          .replace("{count}", String(inputCount))
          .replace("{minimum}", String(minimumInputCount))}
      </Text>
      <Button
        type="button"
        onClick={handleShare}
        loading={shareState === "sharing"}
        loadingLabel={labels.sharing}
        className="w-full sm:w-fit"
      >
        <Text as="span" size="sm" weight="medium" className="text-primary-foreground">
          {labels.share}
        </Text>
      </Button>
      {statusMessage ? (
        <Text size="sm" tone={shareState === "error" ? "destructive" : "muted"}>
          {statusMessage}
        </Text>
      ) : null}
    </Surface>
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
