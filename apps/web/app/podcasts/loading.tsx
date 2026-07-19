import { PageContainer } from "@workspace/ui/components/page-container";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { PageHeaderSkeleton } from "../../components/page-header-skeleton";
import { PodcastsExplorerSkeleton } from "./podcasts-explorer-skeleton";

export default function PodcastsLoading() {
  return (
    <PageShell aria-label="Loading podcasts" aria-busy="true">
      <PageContainer>
        <PageHeaderSkeleton eyebrow />
        <PodcastsExplorerSkeleton />
        <footer className="border-t py-8" aria-hidden="true">
          <Skeleton className="h-4 w-full max-w-4xl" />
        </footer>
      </PageContainer>
    </PageShell>
  );
}
