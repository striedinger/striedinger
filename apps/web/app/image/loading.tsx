import { PageContainer } from "@workspace/ui/components/page-container";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Surface } from "@workspace/ui/components/surface";

import { PageHeaderSkeleton } from "../../components/page-header-skeleton";

export default function ImageLoading() {
  return (
    <PageShell aria-label="Loading image optimizer" aria-busy="true">
      <PageContainer>
        <div className="flex flex-col gap-12">
          <PageHeaderSkeleton />
          <div
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start"
            aria-hidden="true"
          >
            <Surface className="flex min-h-64 flex-col items-center justify-center gap-5 p-8">
              <Skeleton className="size-14 rounded-2xl" />
              <div className="flex w-full max-w-sm flex-col items-center gap-2">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-4 w-full" />
              </div>
              <Skeleton className="h-10 w-28 rounded-lg" />
            </Surface>
            <Surface className="flex min-h-[28rem] flex-col gap-6 p-5">
              {["w-36", "w-24", "w-40", "w-28"].map(function renderSetting(width) {
                return (
                  <div key={width} className="flex flex-col gap-2">
                    <Skeleton className={`h-4 ${width}`} />
                    <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                );
              })}
              <Skeleton className="mt-auto h-12 w-full border-t border-border pt-5" />
            </Surface>
          </div>
        </div>
      </PageContainer>
    </PageShell>
  );
}
