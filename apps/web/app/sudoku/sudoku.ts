import type { SudokuDifficulty, SudokuPuzzle } from "./types";

const BOARD_SIZE = 9;
const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const BOX_SIZE = 3;

const clueTargets: Readonly<Record<SudokuDifficulty, number>> = {
  easy: 40,
  medium: 32,
  hard: 27,
};

export function createDailyPuzzle(date: string, difficulty: SudokuDifficulty): SudokuPuzzle {
  const random = createSeededRandom(`${date}:${difficulty}`);
  const solution = createSolution(random);
  const puzzle = createPuzzle(solution, clueTargets[difficulty], random);

  return { date, difficulty, puzzle, solution };
}

export function isPuzzleComplete(values: readonly number[], solution: readonly number[]): boolean {
  return (
    values.length === CELL_COUNT &&
    values.every(function matchesSolution(value, index) {
      return value === solution[index];
    })
  );
}

export function hasConflict(values: readonly number[], cellIndex: number): boolean {
  const value = values[cellIndex];

  if (!value) {
    return false;
  }

  const row = Math.floor(cellIndex / BOARD_SIZE);
  const column = cellIndex % BOARD_SIZE;
  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxColumn = Math.floor(column / BOX_SIZE) * BOX_SIZE;

  for (let index = 0; index < BOARD_SIZE; index += 1) {
    const rowIndex = row * BOARD_SIZE + index;
    const columnIndex = index * BOARD_SIZE + column;
    const boxIndex =
      (boxRow + Math.floor(index / BOX_SIZE)) * BOARD_SIZE + boxColumn + (index % BOX_SIZE);

    if (
      (rowIndex !== cellIndex && values[rowIndex] === value) ||
      (columnIndex !== cellIndex && values[columnIndex] === value) ||
      (boxIndex !== cellIndex && values[boxIndex] === value)
    ) {
      return true;
    }
  }

  return false;
}

export function formatElapsedTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function calculateInputScore(minimumInputs: number, actualInputs: number): number {
  if (minimumInputs <= 0 || actualInputs <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((minimumInputs / actualInputs) * 100));
}

export function calculateLiveInputScore(
  minimumInputs: number,
  filledPlayerCells: number,
  actualInputs: number,
): number {
  const wastedInputs = Math.max(0, actualInputs - filledPlayerCells);
  return calculateInputScore(minimumInputs, minimumInputs + wastedInputs);
}

export function countFilledPlayerCells(
  values: readonly number[],
  puzzle: readonly number[],
): number {
  return values.reduce(function countFilledCells(filledCells, value, cellIndex) {
    const isPlayerCell = puzzle[cellIndex] === 0;
    return filledCells + (isPlayerCell && value !== 0 ? 1 : 0);
  }, 0);
}

function createSolution(random: () => number): number[] {
  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random);
  const rows = shuffleGroups(random);
  const columns = shuffleGroups(random);

  return rows.flatMap(function createRow(row) {
    return columns.map(function createCell(column) {
      const patternIndex = (row * BOX_SIZE + Math.floor(row / BOX_SIZE) + column) % BOARD_SIZE;
      return digits[patternIndex];
    });
  });
}

function shuffleGroups(random: () => number): number[] {
  return shuffle([0, 1, 2], random).flatMap(function createGroup(group) {
    return shuffle([0, 1, 2], random).map(function createIndex(index) {
      return group * BOX_SIZE + index;
    });
  });
}

function createPuzzle(
  solution: readonly number[],
  targetClues: number,
  random: () => number,
): number[] {
  const puzzle = [...solution];
  const removalOrder = shuffle(
    Array.from({ length: CELL_COUNT }, function createIndex(_, index) {
      return index;
    }),
    random,
  );
  let clues = CELL_COUNT;

  for (const cellIndex of removalOrder) {
    if (clues <= targetClues) {
      break;
    }

    const previousValue = puzzle[cellIndex];
    puzzle[cellIndex] = 0;

    if (countSolutions(puzzle, 2) === 1) {
      clues -= 1;
    } else {
      puzzle[cellIndex] = previousValue;
    }
  }

  return puzzle;
}

function countSolutions(values: readonly number[], limit: number): number {
  const board = [...values];
  let solutionCount = 0;

  function search(): void {
    if (solutionCount >= limit) {
      return;
    }

    const nextCell = findBestEmptyCell(board);

    if (!nextCell) {
      solutionCount += 1;
      return;
    }

    for (const candidate of nextCell.candidates) {
      board[nextCell.index] = candidate;
      search();
      board[nextCell.index] = 0;

      if (solutionCount >= limit) {
        return;
      }
    }
  }

  search();
  return solutionCount;
}

function findBestEmptyCell(
  board: readonly number[],
): { index: number; candidates: readonly number[] } | undefined {
  let bestCell: { index: number; candidates: readonly number[] } | undefined;

  for (let cellIndex = 0; cellIndex < CELL_COUNT; cellIndex += 1) {
    if (board[cellIndex] !== 0) {
      continue;
    }

    const candidates = getCandidates(board, cellIndex);

    if (candidates.length === 0) {
      return { index: cellIndex, candidates };
    }

    if (!bestCell || candidates.length < bestCell.candidates.length) {
      bestCell = { index: cellIndex, candidates };
    }
  }

  return bestCell;
}

function getCandidates(board: readonly number[], cellIndex: number): number[] {
  const usedValues = new Set<number>();
  const row = Math.floor(cellIndex / BOARD_SIZE);
  const column = cellIndex % BOARD_SIZE;
  const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const boxColumn = Math.floor(column / BOX_SIZE) * BOX_SIZE;

  for (let index = 0; index < BOARD_SIZE; index += 1) {
    usedValues.add(board[row * BOARD_SIZE + index]);
    usedValues.add(board[index * BOARD_SIZE + column]);
    usedValues.add(
      board[(boxRow + Math.floor(index / BOX_SIZE)) * BOARD_SIZE + boxColumn + (index % BOX_SIZE)],
    );
  }

  return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(function isAvailable(value) {
    return !usedValues.has(value);
  });
}

function createSeededRandom(seed: string): () => number {
  let state = hashSeed(seed);

  return function random() {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function hashSeed(seed: string): number {
  let hash = 2_166_136_261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

function shuffle<Value>(values: readonly Value[], random: () => number): Value[] {
  const shuffledValues = [...values];

  for (let index = shuffledValues.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(random() * (index + 1));
    [shuffledValues[index], shuffledValues[targetIndex]] = [
      shuffledValues[targetIndex],
      shuffledValues[index],
    ];
  }

  return shuffledValues;
}
