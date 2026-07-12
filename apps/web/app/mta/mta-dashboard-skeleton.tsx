import { Surface } from "@workspace/ui/components/surface";

export function MtaDashboardSkeleton() {
  return (
    <div
      className="flex animate-pulse flex-col gap-10 motion-reduce:animate-none"
      aria-hidden="true"
    >
      <Surface className="h-40 bg-muted/40" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Surface className="h-72 bg-muted/40" />
        <Surface className="h-72 bg-muted/40" />
      </div>
    </div>
  );
}
