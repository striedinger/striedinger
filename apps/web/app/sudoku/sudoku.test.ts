import { describe, expect, it } from "vitest";

import {
  calculateInputScore,
  calculateLiveInputScore,
  countFilledPlayerCells,
  createDailyPuzzle,
  formatElapsedTime,
  hasConflict,
  isPuzzleComplete,
} from "./sudoku";

describe("daily Sudoku puzzles", function () {
  it("returns the same puzzle for everyone using the same date and difficulty", function () {
    expect(createDailyPuzzle("2026-07-12", "medium")).toEqual(
      createDailyPuzzle("2026-07-12", "medium"),
    );
  });

  it("creates different puzzles for each difficulty", function () {
    const easyPuzzle = createDailyPuzzle("2026-07-12", "easy");
    const hardPuzzle = createDailyPuzzle("2026-07-12", "hard");

    expect(easyPuzzle.puzzle).not.toEqual(hardPuzzle.puzzle);
    expect(easyPuzzle.puzzle.filter(Boolean)).toHaveLength(40);
    expect(hardPuzzle.puzzle.filter(Boolean).length).toBeGreaterThanOrEqual(27);
  });

  it("keeps every clue consistent with its solution", function () {
    const dailyPuzzle = createDailyPuzzle("2026-07-12", "hard");

    dailyPuzzle.puzzle.forEach(function verifyClue(value, index) {
      if (value) {
        expect(value).toBe(dailyPuzzle.solution[index]);
      }
    });
    expect(isPuzzleComplete(dailyPuzzle.solution, dailyPuzzle.solution)).toBe(true);
    expect(isValidSolution(dailyPuzzle.solution)).toBe(true);
  });
});

describe("Sudoku game helpers", function () {
  it("identifies duplicate values in a row, column, or box", function () {
    const values = Array<number>(81).fill(0);
    values[0] = 7;
    values[8] = 7;

    expect(hasConflict(values, 0)).toBe(true);
    expect(hasConflict(values, 8)).toBe(true);
    expect(hasConflict(values, 40)).toBe(false);
  });

  it("formats elapsed time for the game and share result", function () {
    expect(formatElapsedTime(65)).toBe("01:05");
    expect(formatElapsedTime(3_725)).toBe("62:05");
  });

  it("scores a solve by input efficiency", function () {
    expect(calculateInputScore(40, 40)).toBe(100);
    expect(calculateInputScore(40, 50)).toBe(80);
    expect(calculateInputScore(40, 30)).toBe(100);
  });

  it("keeps a perfect live score while each input fills a new cell", function () {
    expect(calculateLiveInputScore(40, 0, 0)).toBe(100);
    expect(calculateLiveInputScore(40, 10, 10)).toBe(100);
    expect(calculateLiveInputScore(40, 10, 11)).toBe(98);
    expect(calculateLiveInputScore(40, 9, 11)).toBe(95);
  });

  it("counts filled player cells without including puzzle clues", function () {
    const puzzle = [5, 0, 0];

    expect(countFilledPlayerCells([5, 2, 7], puzzle)).toBe(2);
    expect(countFilledPlayerCells([5, 2, 0], puzzle)).toBe(1);
  });
});

function isValidSolution(solution: readonly number[]): boolean {
  const expectedDigits = "123456789";
  const groups: number[][] = [];

  for (let index = 0; index < 9; index += 1) {
    groups.push(solution.slice(index * 9, index * 9 + 9));
    groups.push(
      Array.from({ length: 9 }, function getColumnValue(_, row) {
        return solution[row * 9 + index];
      }),
    );
  }

  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxColumn = 0; boxColumn < 3; boxColumn += 1) {
      groups.push(
        Array.from({ length: 9 }, function getBoxValue(_, index) {
          const row = boxRow * 3 + Math.floor(index / 3);
          const column = boxColumn * 3 + (index % 3);
          return solution[row * 9 + column];
        }),
      );
    }
  }

  return groups.every(function containsEachDigit(group) {
    return group.toSorted((first, second) => first - second).join("") === expectedDigits;
  });
}
