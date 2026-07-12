export type SudokuDifficulty = "easy" | "medium" | "hard";

export interface SudokuPuzzle {
  difficulty: SudokuDifficulty;
  date: string;
  puzzle: readonly number[];
  solution: readonly number[];
}

export interface SudokuLabels {
  cellEmpty: string;
  cellValue: string;
  cancel: string;
  chooseDifficulty: string;
  completed: string;
  date: string;
  description: string;
  difficulty: Readonly<Record<SudokuDifficulty, string>>;
  erase: string;
  numberPad: string;
  puzzle: string;
  restart: string;
  restartConfirm: string;
  restartDescription: string;
  restartTitle: string;
  score: string;
  scoreInputs: string;
  share: string;
  shareDownloaded: string;
  shareError: string;
  shared: string;
  sharing: string;
  start: string;
  startPrompt: string;
  time: string;
  title: string;
}
