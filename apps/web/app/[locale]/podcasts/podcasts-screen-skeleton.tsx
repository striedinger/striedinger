import { IosSkeleton } from "../../../components/ios/ios-skeleton";

const placeholderRows = [0, 1, 2, 3, 4];

/** A screen's placeholder while its route loads; the layout's bars stay on screen around it. */
export function PodcastsScreenSkeleton() {
  return (
    <div
      aria-busy="true"
      className="absolute inset-0 flex flex-col gap-6 bg-ios-background px-4 pt-safe-plus-16"
    >
      <IosSkeleton className="h-9 w-32" />
      <div className="flex gap-3 overflow-hidden">
        <IosSkeleton className="h-39 w-[min(86vw,420px)] shrink-0 rounded-ios-xl" />
        <IosSkeleton className="h-39 w-[min(86vw,420px)] shrink-0 rounded-ios-xl" />
      </div>
      <IosSkeleton className="h-7 w-40" />
      {placeholderRows.map(function renderRow(row) {
        return (
          <div key={row} className="flex items-center gap-3">
            <IosSkeleton className="size-16 shrink-0 rounded-md" />
            <div className="flex flex-1 flex-col gap-2">
              <IosSkeleton className="h-4 w-3/5" />
              <IosSkeleton className="h-3 w-1/3" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
