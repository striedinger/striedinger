import { PageContainer } from "@workspace/ui/components/page-container";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { PageHeaderSkeleton } from "../../components/page-header-skeleton";
import { StockDashboardSkeleton } from "./stock-dashboard-skeleton";

export default function StocksLoading() {
  return (
    <PageShell aria-label="Loading stock watchlist" aria-busy="true">
      <PageContainer>
        <PageHeaderSkeleton eyebrow />
        <StockDashboardSkeleton />
        <footer className="border-t py-8" aria-hidden="true">
          <Skeleton className="h-4 w-full max-w-3xl" />
        </footer>
      </PageContainer>
    </PageShell>
  );
}
