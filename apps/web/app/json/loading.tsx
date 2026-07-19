import { PageContainer } from "@workspace/ui/components/page-container";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Skeleton } from "@workspace/ui/components/skeleton";

import { PageHeaderSkeleton } from "../../components/page-header-skeleton";

export default function JsonLoading() {
  return (
    <PageShell aria-label="Loading JSON tool" aria-busy="true">
      <PageContainer>
        <div className="flex flex-col gap-12">
          <PageHeaderSkeleton />
          <div className="grid gap-10 lg:grid-cols-2" aria-hidden="true">
            {["input", "preview"].map(function renderEditor(name) {
              return (
                <section key={name} className="flex min-w-0 flex-col gap-5">
                  <div className="flex h-8 items-center">
                    <Skeleton className="h-7 w-32" />
                  </div>
                  <Skeleton className="h-[32rem] min-h-[32rem] w-full rounded-xl" />
                  <Skeleton className="h-5 w-4/5" />
                </section>
              );
            })}
          </div>
        </div>
      </PageContainer>
    </PageShell>
  );
}
