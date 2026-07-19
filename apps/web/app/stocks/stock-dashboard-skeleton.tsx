import { Surface } from "@workspace/ui/components/surface";

export function StockDashboardSkeleton() {
  return (
    <div
      className="grid animate-pulse gap-5 motion-reduce:animate-none lg:grid-cols-[15rem_minmax(0,1fr)]"
      aria-hidden="true"
    >
      <div className="flex flex-col gap-5">
        <div className="h-16 rounded-xl bg-muted/50" />
        <Surface className="h-64 bg-muted/40" />
      </div>
      <Surface className="min-h-[34rem] bg-muted/40" />
    </div>
  );
}
