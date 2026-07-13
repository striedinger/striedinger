export function AppLoadingFallback() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-14"
    >
      <div className="h-10 w-48 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      <div className="h-6 w-full max-w-2xl animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      <div className="h-72 w-full animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
    </div>
  );
}
