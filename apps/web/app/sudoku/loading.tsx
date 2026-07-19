import { PageContainer } from "@workspace/ui/components/page-container";
import { PageShell } from "@workspace/ui/components/page-shell";

import { PageHeaderSkeleton } from "../../components/page-header-skeleton";
import { SudokuGameSkeleton } from "./sudoku-game-skeleton";

export default function SudokuLoading() {
  return (
    <PageShell className="py-6 sm:py-14" aria-label="Loading daily Sudoku" aria-busy="true">
      <PageContainer>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 sm:gap-14">
          <PageHeaderSkeleton compact />
          <SudokuGameSkeleton />
        </div>
      </PageContainer>
    </PageShell>
  );
}
