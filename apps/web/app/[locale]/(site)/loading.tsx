import { Skeleton } from "@workspace/ui/components/skeleton";

export default function HomeLoading() {
  return (
    <main
      className="flex min-h-svh flex-col items-center gap-10 font-sans"
      aria-label="Loading page"
      aria-busy="true"
    >
      <section className="flex w-full flex-col items-center gap-8 px-8 pt-28 sm:pt-40">
        <div className="flex w-full max-w-xl flex-col items-center gap-3">
          <Skeleton className="h-9 w-[min(100%,30rem)]" />
          <Skeleton className="h-9 w-64" />
        </div>
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-7 w-[min(100%,26rem)]" />
        <Skeleton className="h-6 w-36" />
      </section>
      <div className="flex gap-4" aria-hidden="true">
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="size-11 rounded-full" />
      </div>
      <Skeleton className="h-9 w-44 rounded-md" aria-hidden="true" />
    </main>
  );
}
