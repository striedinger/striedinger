import { PageContainer } from "@workspace/ui/components/page-container";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { PageHeaderSkeleton } from "../../components/page-header-skeleton";

export default function PdfLoading() {
  return (
    <PageShell aria-label="Loading PDF optimizer" aria-busy="true">
      <PageContainer>
        <div className="flex flex-col gap-12">
          <PageHeaderSkeleton />
          <div
            className="flex min-h-72 flex-col items-center justify-center gap-5 rounded-xl border-2 border-dashed border-border bg-surface-inset px-6 py-12"
            aria-hidden="true"
          >
            <Skeleton className="size-14 rounded-2xl" />
            <div className="flex w-full max-w-xs flex-col items-center gap-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>
      </PageContainer>
    </PageShell>
  );
}
