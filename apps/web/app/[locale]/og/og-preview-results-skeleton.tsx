import { IosSkeleton } from "../../../components/ios/ios-skeleton";

export function OgPreviewResultsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-hidden="true">
      <IosSkeleton className="mx-5 h-3 w-2/3" />
      <IosSkeleton className="mt-3 ml-5 h-4 w-40" />
      <IosSkeleton className="aspect-[1.91/1] w-full rounded-[22px]" />
    </div>
  );
}
