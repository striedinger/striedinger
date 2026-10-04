import { MtaDashboardSkeleton } from "./mta-dashboard-skeleton";

export default function MtaLoading() {
  return (
    <div
      aria-busy="true"
      className="mx-auto flex size-full max-w-5xl flex-col bg-ios-grouped-background pt-safe-plus-26"
    >
      <MtaDashboardSkeleton />
    </div>
  );
}
