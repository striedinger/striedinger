import { SudokuGameSkeleton } from "./sudoku-game-skeleton";

export default function SudokuLoading() {
  return (
    <div
      aria-busy="true"
      className="mx-auto flex size-full max-w-xl flex-col bg-ios-grouped-background px-4 pt-safe-plus-26 pb-safe-min-3.5"
    >
      <SudokuGameSkeleton />
    </div>
  );
}
