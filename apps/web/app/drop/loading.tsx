import { PageContainer } from "@workspace/ui/components/page-container";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Surface } from "@workspace/ui/components/surface";

import { PageHeaderSkeleton } from "../../components/page-header-skeleton";

export default function DropLoading() {
  return (
    <PageShell aria-label="Loading private file sharing" aria-busy="true">
      <PageContainer>
        <div className="flex flex-col gap-10">
          <PageHeaderSkeleton eyebrow />
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="flex min-w-0 flex-col gap-8" aria-hidden="true">
              <Surface className="flex min-h-56 flex-col items-center justify-center gap-5 rounded-3xl border-2 border-dashed px-6 py-8 sm:min-h-48 sm:flex-row sm:justify-start sm:px-8">
                <Skeleton className="size-16 shrink-0 rounded-2xl" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-5 w-full max-w-md" />
                </div>
                <Skeleton className="h-11 w-32 rounded-xl" />
              </Surface>
              <div className="flex flex-col gap-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
            </div>
            <Surface
              className="flex min-h-[28rem] flex-col gap-6 rounded-3xl p-6 sm:p-8"
              aria-hidden="true"
            >
              <div className="flex justify-between gap-4">
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="size-10 rounded-full" />
              </div>
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-11 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-2xl" />
              <div className="mt-auto flex flex-col gap-3 border-t border-border pt-6">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>
            </Surface>
          </div>
        </div>
      </PageContainer>
    </PageShell>
  );
}
