import { MtaDashboardSkeleton } from "./mta-dashboard-skeleton";

export default function MtaLoading() {
  return (
    <div
      aria-busy="true"
      className="bg-ios-grouped-background mx-auto flex size-full max-w-5xl flex-col pt-[calc(6.5rem+env(safe-area-inset-top))]"
    >
      <MtaDashboardSkeleton />
    </div>
  );
}
