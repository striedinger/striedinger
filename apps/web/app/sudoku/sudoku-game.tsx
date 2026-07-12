"use client";

import { Button } from "@workspace/ui/components/button";
import { Text } from "@workspace/ui/components/text";
import { useMemo, useState, type KeyboardEvent } from "react";

import type { SudokuDifficulty, SudokuLabels, SudokuPuzzle } from "./types";

import { CompletionCard } from "./completion-card";
import { triggerHapticFeedback } from "./haptics";
import { NumberPad } from "./number-pad";
import { RestartGameDialog } from "./restart-game-dialog";
import {
  calculateLiveInputScore,
  countFilledPlayerCells,
  formatElapsedTime,
  isPuzzleComplete,
} from "./sudoku";
import { SudokuBoard } from "./sudoku-board";
import { SudokuTimer } from "./sudoku-timer";

interface SudokuGameProps {
  labels: SudokuLabels;
  locale: string;
  puzzles: Readonly<Record<SudokuDifficulty, SudokuPuzzle>>;
}

const difficulties: readonly SudokuDifficulty[] = ["easy", "medium", "hard"];

export function SudokuGame({ labels, locale, puzzles }: SudokuGameProps) {
  const [difficulty, setDifficulty] = useState<SudokuDifficulty>("easy");
  const activePuzzle = puzzles[difficulty];
  const [values, setValues] = useState<number[]>(function createInitialValues() {
    return [...puzzles.easy.puzzle];
  });
  const [selectedCell, setSelectedCell] = useState(function findInitialCell() {
    return puzzles.easy.puzzle.findIndex(function isEmpty(value) {
      return value === 0;
    });
  });
  const [startedAt, setStartedAt] = useState<number>();
  const [completedSeconds, setCompletedSeconds] = useState<number>();
  const [inputCount, setInputCount] = useState(0);
  const isComplete = completedSeconds !== undefined;
  const minimumInputCount = activePuzzle.puzzle.filter(function isEmpty(value) {
    return value === 0;
  }).length;
  const filledPlayerCells = countFilledPlayerCells(values, activePuzzle.puzzle);
  const liveScore = calculateLiveInputScore(minimumInputCount, filledPlayerCells, inputCount);
  const localizedDate = useMemo(
    function formatPuzzleDate() {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(new Date(`${activePuzzle.date}T00:00:00Z`));
    },
    [activePuzzle.date, locale],
  );

  function handleDifficultyChange(nextDifficulty: SudokuDifficulty) {
    const nextPuzzle = puzzles[nextDifficulty];
    setDifficulty(nextDifficulty);
    setValues([...nextPuzzle.puzzle]);
    setSelectedCell(
      nextPuzzle.puzzle.findIndex(function isEmpty(value) {
        return value === 0;
      }),
    );
    setStartedAt(undefined);
    setCompletedSeconds(undefined);
    setInputCount(0);
  }

  function handleValueChange(value: number) {
    if (
      isComplete ||
      startedAt === undefined ||
      selectedCell < 0 ||
      activePuzzle.puzzle[selectedCell] !== 0
    ) {
      return;
    }

    const nextValues = [...values];

    if (nextValues[selectedCell] === value) {
      return;
    }

    nextValues[selectedCell] = value;
    setInputCount(function incrementInputCount(currentInputCount) {
      return currentInputCount + 1;
    });
    setValues(nextValues);

    if (isPuzzleComplete(nextValues, activePuzzle.solution)) {
      setCompletedSeconds(Math.floor((Date.now() - startedAt) / 1_000));
    }
  }

  function handleStart() {
    triggerHapticFeedback();
    setStartedAt(Date.now());
  }

  function handleRestart() {
    triggerHapticFeedback();
    setValues([...activePuzzle.puzzle]);
    setSelectedCell(
      activePuzzle.puzzle.findIndex(function isEmpty(value) {
        return value === 0;
      }),
    );
    setStartedAt(undefined);
    setCompletedSeconds(undefined);
    setInputCount(0);
  }

  function handleCellSelect(cellIndex: number) {
    triggerHapticFeedback();
    setSelectedCell(cellIndex);
  }

  function handleNumberSelect(value: number) {
    triggerHapticFeedback();
    handleValueChange(value);
  }

  function handleKeyboardInput(event: KeyboardEvent<HTMLDivElement>) {
    if (startedAt === undefined) {
      return;
    }

    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      handleValueChange(Number(event.key));
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
      event.preventDefault();
      handleValueChange(0);
      return;
    }

    const movement = getKeyboardMovement(event.key);

    if (movement !== 0) {
      event.preventDefault();
      setSelectedCell(function moveSelection(currentCell) {
        return Math.min(80, Math.max(0, currentCell + movement));
      });
    }
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-8">
      <section className="flex flex-col gap-2 sm:gap-3" aria-labelledby="difficulty-heading">
        <div className="flex min-h-8 items-center justify-between gap-4">
          <Text as="h2" id="difficulty-heading" size="sm" weight="semibold">
            {labels.chooseDifficulty}
          </Text>
          {startedAt !== undefined ? (
            <RestartGameDialog
              cancelLabel={labels.cancel}
              confirmLabel={labels.restartConfirm}
              description={labels.restartDescription}
              onConfirm={handleRestart}
              title={labels.restartTitle}
              triggerLabel={labels.restart}
            />
          ) : null}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {difficulties.map(function renderDifficulty(option) {
            const isSelected = difficulty === option;

            return (
              <Button
                key={option}
                type="button"
                variant={isSelected ? "default" : "outline"}
                aria-pressed={isSelected}
                disabled={startedAt !== undefined}
                onClick={function selectDifficulty() {
                  triggerHapticFeedback();
                  handleDifficultyChange(option);
                }}
                className="w-full transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              >
                <Text
                  as="span"
                  size="sm"
                  weight="medium"
                  className={isSelected ? "text-primary-foreground" : undefined}
                >
                  {labels.difficulty[option]}
                </Text>
              </Button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-[1fr_auto_auto] items-end gap-4">
        <div className="flex flex-col gap-1">
          <Text size="xs" tone="muted">
            {labels.date}
          </Text>
          <Text size="sm" weight="medium">
            {localizedDate}
          </Text>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Text size="xs" tone="muted">
            {labels.time}
          </Text>
          <SudokuTimer completedSeconds={completedSeconds} startedAt={startedAt} />
        </div>
        <div className="flex flex-col items-end gap-1">
          <Text size="xs" tone="muted">
            {labels.score}
          </Text>
          <Text
            size="xl"
            weight="semibold"
            family="rounded"
            className="tabular-nums"
            aria-live="polite"
          >
            {startedAt === undefined ? "—" : `${liveScore}/100`}
          </Text>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[20rem] flex-col gap-4 sm:max-w-[36rem] sm:gap-5">
        <div className="relative">
          <div inert={startedAt === undefined ? true : undefined}>
            <SudokuBoard
              cellEmptyLabel={labels.cellEmpty}
              cellValueLabel={labels.cellValue}
              fixedValues={activePuzzle.puzzle}
              label={labels.puzzle}
              onSelect={handleCellSelect}
              onKeyDown={handleKeyboardInput}
              selectedCell={selectedCell}
              values={values}
            />
          </div>
          {startedAt === undefined ? (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 rounded-lg border-2 border-foreground/70 bg-card/95 p-6 text-center backdrop-blur-sm">
              <Text as="h2" size="2xl" weight="semibold">
                {labels.startPrompt}
              </Text>
              <Button
                type="button"
                size="lg"
                onClick={handleStart}
                className="min-w-36 transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              >
                <Text as="span" size="sm" weight="semibold" className="text-primary-foreground">
                  {labels.start}
                </Text>
              </Button>
            </div>
          ) : null}
        </div>
        <NumberPad
          disabled={
            startedAt === undefined ||
            isComplete ||
            selectedCell < 0 ||
            activePuzzle.puzzle[selectedCell] !== 0
          }
          eraseLabel={labels.erase}
          label={labels.numberPad}
          onSelect={handleNumberSelect}
        />
      </div>

      {isComplete ? (
        <CompletionCard
          date={activePuzzle.date}
          difficulty={difficulty}
          elapsedTime={formatElapsedTime(completedSeconds)}
          inputCount={inputCount}
          labels={labels}
          localizedDate={localizedDate}
          minimumInputCount={minimumInputCount}
          score={liveScore}
        />
      ) : null}
    </div>
  );
}

function getKeyboardMovement(key: string): number {
  switch (key) {
    case "ArrowLeft":
      return -1;
    case "ArrowRight":
      return 1;
    case "ArrowUp":
      return -9;
    case "ArrowDown":
      return 9;
    default:
      return 0;
  }
}
