import { iosGlassClassName } from "../../components/ios/ios-glass";
import { IosSkeleton } from "../../components/ios/ios-skeleton";

/** The Podcasts layout with shimmering placeholders while live data streams in. */
export function PodcastsSkeleton() {
  return (
    <div
      aria-busy="true"
      className="relative flex size-full flex-col bg-(--ios-background) md:flex-row"
    >
      <div className="hidden md:m-3 md:mr-0 md:flex md:w-[280px] md:flex-col md:gap-3 md:rounded-[30px] md:bg-(--ios-glass) md:p-3">
        <IosSkeleton className="h-8 w-36" />
        <IosSkeleton className="h-11 rounded-full" />
        <IosSkeleton className="h-10 w-full rounded-full" />
        <IosSkeleton className="h-10 w-3/4 rounded-full" />
        <IosSkeleton className="h-10 w-2/3 rounded-full" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-6 px-4 pt-16">
        <IosSkeleton className="h-9 w-32" />
        <div className="flex gap-3 overflow-hidden">
          <IosSkeleton className="h-[156px] w-[min(86vw,420px)] shrink-0 rounded-[24px]" />
          <IosSkeleton className="h-[156px] w-[min(86vw,420px)] shrink-0 rounded-[24px]" />
        </div>
        <IosSkeleton className="h-7 w-40" />
        {[0, 1, 2, 3].map(function renderRow(row) {
          return (
            <div key={row} className="flex items-center gap-3">
              <IosSkeleton className="size-16 shrink-0" />
              <div className="flex flex-1 flex-col gap-2">
                <IosSkeleton className="h-4 w-3/5" />
                <IosSkeleton className="h-3 w-1/3" />
              </div>
            </div>
          );
        })}
      </div>
      <div className="absolute inset-x-4 bottom-[max(env(safe-area-inset-bottom),14px)] flex gap-3 md:hidden">
        <span className={`h-[62px] flex-1 rounded-full ${iosGlassClassName}`} />
        <span className={`size-[62px] rounded-full ${iosGlassClassName}`} />
      </div>
    </div>
  );
}
