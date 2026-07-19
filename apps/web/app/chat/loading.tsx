import { PageContainer } from "@workspace/ui/components/page-container";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Surface } from "@workspace/ui/components/surface";

import { PageHeaderSkeleton } from "../../components/page-header-skeleton";

export default function ChatLoading() {
  return (
    <PageShell className="py-4 sm:py-8" aria-label="Loading nearby chat" aria-busy="true">
      <PageContainer>
        <div className="flex flex-col gap-4 sm:gap-6">
          <PageHeaderSkeleton compact eyebrow />
          <Surface
            className="mx-auto flex h-[calc(100svh-11rem)] min-h-[32rem] w-full max-w-4xl flex-col overflow-hidden rounded-3xl sm:h-[min(46rem,calc(100svh-12rem))]"
            aria-hidden="true"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-11 w-28 rounded-xl" />
            </div>
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="flex w-full max-w-sm flex-col items-center gap-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            <div className="flex gap-2 border-t border-border p-3 sm:p-4">
              <Skeleton className="h-12 flex-1 rounded-xl" />
              <Skeleton className="h-12 w-20 rounded-xl" />
            </div>
          </Surface>
        </div>
      </PageContainer>
    </PageShell>
  );
}
