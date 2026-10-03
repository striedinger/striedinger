"use client";

import { Text } from "@workspace/ui/components/text";
import { useMemo, useState, type KeyboardEvent } from "react";

import type { SudokuDifficulty, SudokuLabels, SudokuPuzzle } from "./types";

import { IosSegmentedControl } from "../../../components/ios/ios-segmented-control";
import { CompletionCard } from "./completion-card";
import { triggerHapticFeedback } from "./haptics";
import { NumberPad } from "./number-pad";
import { RestartGameDialog } from "./restart-game-dialog";
import {
  calculateLiveInputScore,
  countFilledPlayerCells,
  formatElapsedTime,
  getCompletedNumbers,
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
  const completedNumbers = getCompletedNumbers(values, activePuzzle.solution);
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

    if (value > 0 && completedNumbers.has(value)) return;

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

    if (isMovementKey(event.key)) {
      event.preventDefault();
      setSelectedCell(function moveSelection(currentCell) {
        return getNextCellIndex(currentCell, event.key);
      });
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <Text className="-mt-2 px-1 text-[15px] leading-5 tracking-[-0.23px] text-(--ios-secondary-label)">
        {localizedDate}
      </Text>
      <IosSegmentedControl
        label={labels.chooseDifficulty}
        options={difficulties.map(function createOption(option) {
          return { label: labels.difficulty[option], value: option };
        })}
        value={difficulty}
        disabled={startedAt !== undefined}
        onChange={function selectDifficulty(option) {
          triggerHapticFeedback();
          handleDifficultyChange(option);
        }}
      />

      <div className="flex items-stretch gap-3">
        <div className="flex flex-1 flex-col gap-0.5 rounded-[18px] bg-(--ios-grouped-cell) px-4 py-2.5">
          <Text className="text-[13px] leading-[18px] text-(--ios-secondary-label)">
            {labels.time}
          </Text>
          <SudokuTimer completedSeconds={completedSeconds} startedAt={startedAt} />
        </div>
        <div className="flex flex-1 flex-col gap-0.5 rounded-[18px] bg-(--ios-grouped-cell) px-4 py-2.5">
          <Text className="text-[13px] leading-[18px] text-(--ios-secondary-label)">
            {labels.score}
          </Text>
          <Text
            family="rounded"
            aria-live="polite"
            className="text-[22px] leading-7 font-semibold text-(--ios-label) tabular-nums"
          >
            {startedAt === undefined ? "—" : `${liveScore}/100`}
          </Text>
        </div>
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

      <div className="relative">
        <div inert={startedAt === undefined ? true : undefined}>
          <SudokuBoard
            active={startedAt !== undefined}
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
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 rounded-[22px] bg-(--ios-grouped-background)/55 p-6 text-center backdrop-blur-[10px]">
            <Text
              as="h2"
              className="text-[22px] leading-7 font-bold tracking-[0.35px] text-(--ios-label)"
            >
              {labels.startPrompt}
            </Text>
            <button
              type="button"
              onClick={handleStart}
              className="h-[50px] min-w-44 rounded-full bg-(--ios-tint) px-8 text-[17px] font-semibold tracking-[-0.43px] text-white shadow-[inset_0_0.5px_0_0.5px_rgb(255_255_255/0.35),0_8px_24px_rgb(0_0_0/0.18)] outline-none focus-visible:ring-2 focus-visible:ring-(--ios-tint)/50 active:scale-[0.97] motion-safe:transition-transform"
            >
              {labels.start}
            </button>
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
        disabledValues={completedNumbers}
        eraseLabel={labels.erase}
        label={labels.numberPad}
        onSelect={handleNumberSelect}
      />

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

function isMovementKey(key: string): boolean {
  return key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown";
}

function getNextCellIndex(currentCell: number, key: string): number {
  const row = Math.floor(currentCell / 9);
  const column = currentCell % 9;

  switch (key) {
    case "ArrowLeft":
      return row * 9 + Math.max(0, column - 1);
    case "ArrowRight":
      return row * 9 + Math.min(8, column + 1);
    case "ArrowUp":
      return Math.max(0, row - 1) * 9 + column;
    case "ArrowDown":
      return Math.min(8, row + 1) * 9 + column;
    default:
      return currentCell;
  }
}
