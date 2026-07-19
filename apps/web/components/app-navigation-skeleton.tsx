import { Skeleton } from "@workspace/ui/components/skeleton";

export function AppNavigationSkeleton() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-border/70 bg-background/85 shadow-[0_1px_0_var(--surface-highlight)] backdrop-blur-md"
      aria-hidden="true"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
    </header>
  );
}
