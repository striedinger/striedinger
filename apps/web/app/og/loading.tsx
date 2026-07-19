import { PageContainer } from "@workspace/ui/components/page-container";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { PageHeaderSkeleton } from "../../components/page-header-skeleton";

export default function OpenGraphLoading() {
  return (
    <PageShell aria-label="Loading Open Graph preview" aria-busy="true">
      <PageContainer>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-24">
          <div className="flex flex-col gap-12">
            <PageHeaderSkeleton />
            <div className="flex flex-col gap-4" aria-hidden="true">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Skeleton className="h-11 flex-1 rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl sm:w-36" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
          <section
            className="flex flex-col gap-6 border-t border-border/70 pt-12"
            aria-hidden="true"
          >
            <Skeleton className="h-8 w-[min(100%,24rem)]" />
            <div className="flex max-w-2xl flex-col gap-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
            </div>
          </section>
        </div>
      </PageContainer>
    </PageShell>
  );
}
