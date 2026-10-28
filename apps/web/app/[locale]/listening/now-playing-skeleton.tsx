import { IosSkeleton } from "../../../components/ios/ios-skeleton";

/** The Now Playing card's shape while Spotify answers. */
export function NowPlayingSkeleton() {
  return (
    <div
      aria-busy="true"
      className="flex size-full flex-col bg-ios-secondary-background p-[clamp(0.875rem,4.2vw,2.5rem)]"
    >
      <div className="flex items-center justify-between">
        <IosSkeleton className="h-6.5 w-28 rounded-full" />
        <IosSkeleton className="h-6.5 w-14 rounded-full" />
      </div>
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 items-center gap-[clamp(0.875rem,4vw,2.5rem)] pt-[clamp(0.625rem,3vw,1.5rem)]">
        <IosSkeleton className="size-[clamp(5.75rem,min(30vw,52dvh),17.5rem)] shrink-0 rounded-[clamp(0.625rem,2.6vw,1.25rem)]" />
        <div className="flex min-w-0 flex-1 flex-col gap-[clamp(0.5rem,2.4vw,1.25rem)]">
          <div className="flex flex-col gap-1.5">
            <IosSkeleton className="h-5 w-3/4" />
            <IosSkeleton className="h-4 w-1/2" />
          </div>
          <IosSkeleton className="h-1.25 w-full rounded-full" />
          <IosSkeleton className="h-7.5 w-32 rounded-full" />
        </div>
      </div>
    </div>
  );
}
