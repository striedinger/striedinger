import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SudokuLabels, SudokuPuzzle } from "./types";

import { SudokuGame } from "./sudoku-game";

const labels: SudokuLabels = {
  cancel: "Cancel",
  cellEmpty: "Row {row}, column {column}, empty",
  cellValue: "Row {row}, column {column}, {value}",
  chooseDifficulty: "Choose a level",
  completed: "Puzzle complete!",
  date: "Date",
  description: "Daily puzzle",
  difficulty: { easy: "Easy", medium: "Medium", hard: "Hard" },
  erase: "Erase",
  numberPad: "Number pad",
  puzzle: "Sudoku puzzle",
  restart: "Restart puzzle",
  restartConfirm: "Restart",
  restartDescription: "Your current progress and time will be cleared.",
  restartTitle: "Restart this puzzle?",
  score: "Score",
  scoreInputs: "Inputs: {count} · minimum: {minimum}",
  share: "Share result",
  shareDownloaded: "Downloaded",
  shareError: "Error",
  shared: "Shared",
  sharing: "Creating image",
  start: "Start puzzle",
  startPrompt: "Ready for today's puzzle?",
  time: "Time",
  title: "Daily Sudoku",
};

const solution = Array<number>(81).fill(1);
const puzzle = [...solution];
puzzle[0] = 0;

function createPuzzle(difficulty: SudokuPuzzle["difficulty"]): SudokuPuzzle {
  return {
    date: "2026-07-12",
    difficulty,
    puzzle,
    solution,
  };
}

describe("SudokuGame", function () {
  beforeEach(function useControlledTime() {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-12T12:00:00Z"));
  });

  afterEach(function restoreTime() {
    vi.useRealTimers();
  });

  it("keeps the puzzle covered and timer stopped until the player starts", function () {
    render(
      <SudokuGame
        labels={labels}
        locale="en"
        puzzles={{
          easy: createPuzzle("easy"),
          medium: createPuzzle("medium"),
          hard: createPuzzle("hard"),
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: labels.startPrompt })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1" })).toBeDisabled();
    expect(screen.getByText("00:00")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: labels.start }));
    expect(screen.queryByRole("heading", { name: labels.startPrompt })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1" })).toBeEnabled();
    expect(screen.getByRole("button", { name: labels.difficulty.medium })).toBeDisabled();
    expect(screen.getByText("100/100")).toBeInTheDocument();

    act(function advanceTimer() {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText("00:01")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getByText("100/100")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "1" }));
    expect(screen.getAllByText("50/100")).toHaveLength(2);
    expect(screen.getByText("Inputs: 2 · minimum: 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: labels.restart }));
    expect(screen.getByRole("alertdialog", { name: labels.restartTitle })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: labels.restartConfirm }));

    expect(screen.getByRole("heading", { name: labels.startPrompt })).toBeInTheDocument();
    expect(screen.getByText("00:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: labels.difficulty.medium })).toBeEnabled();
  });
});
