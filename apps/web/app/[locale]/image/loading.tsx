import { IosSkeleton } from "../../../components/ios/ios-skeleton";

const settingsSkeletonWidths = ["w-36", "w-16", "w-40", "w-28"] as const;

export default function ImageLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-2 pt-2">
      <IosSkeleton className="h-64 w-full rounded-ios-2xl" />
      <IosSkeleton className="mx-5 mt-1 h-4 w-3/4" />
      {settingsSkeletonWidths.map(function renderSettingSkeleton(width) {
        return (
          <div key={width} className="flex flex-col gap-2 pt-4">
            <IosSkeleton className={`mx-5 h-4 ${width}`} />
            <IosSkeleton className="h-[60px] w-full rounded-ios-xl" />
          </div>
        );
      })}
    </div>
  );
}
