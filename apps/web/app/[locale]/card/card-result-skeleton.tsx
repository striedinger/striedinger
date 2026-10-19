import { IosSkeleton } from "../../../components/ios/ios-skeleton";

/** The card preview and link rows' shape, held while a submitted page is fetched. */
export function CardResultSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <IosSkeleton className="aspect-[1.91] w-full rounded-ios-xl" />
      <IosSkeleton className="h-24 w-full rounded-ios-xl" />
      <IosSkeleton className="h-36 w-full rounded-ios-xl" />
    </div>
  );
}
