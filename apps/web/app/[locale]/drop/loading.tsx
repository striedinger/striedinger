import { IosSkeleton } from "../../../components/ios/ios-skeleton";

export default function DropLoading() {
  return (
    <div
      aria-busy="true"
      className="flex size-full flex-col items-center gap-5 bg-ios-grouped-background px-4 pt-safe-plus-16"
    >
      <IosSkeleton className="h-9 w-24 self-start" />
      <IosSkeleton className="size-44 rounded-full" />
      <IosSkeleton className="h-6 w-56" />
      <IosSkeleton className="h-32 w-full max-w-2xl rounded-ios-xl" />
      <IosSkeleton className="h-14 w-full max-w-2xl rounded-ios-xl" />
    </div>
  );
}
