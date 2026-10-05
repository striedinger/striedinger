import { IosSkeleton } from "../../../components/ios/ios-skeleton";

export default function VideoLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-2 pt-2">
      <IosSkeleton className="h-72 rounded-ios-2xl" />
      <IosSkeleton className="h-4 w-3/4 rounded-full" />
    </div>
  );
}
