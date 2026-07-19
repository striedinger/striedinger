import { PageContainer } from "@workspace/ui/components/page-container";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { PageHeaderSkeleton } from "../../components/page-header-skeleton";
import { MtaDashboardSkeleton } from "./mta-dashboard-skeleton";

export default function MtaLoading() {
  return (
    <PageShell aria-label="Loading nearby trains" aria-busy="true">
      <PageContainer>
        <PageHeaderSkeleton eyebrow />
        <MtaDashboardSkeleton />
        <footer className="border-t py-8" aria-hidden="true">
          <Skeleton className="h-4 w-full max-w-3xl" />
        </footer>
      </PageContainer>
    </PageShell>
  );
}
