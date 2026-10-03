import { SudokuGameSkeleton } from "./sudoku-game-skeleton";

export default function SudokuLoading() {
  return (
    <div
      aria-busy="true"
      className="mx-auto flex size-full max-w-xl flex-col bg-(--ios-grouped-background) px-4 pt-[calc(6.75rem+env(safe-area-inset-top))] pb-[max(env(safe-area-inset-bottom),12px)]"
    >
      <SudokuGameSkeleton />
    </div>
  );
}
