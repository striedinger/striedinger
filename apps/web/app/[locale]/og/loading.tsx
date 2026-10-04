import { IosSkeleton } from "../../../components/ios/ios-skeleton";

export default function OpenGraphLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <div className="flex flex-col">
        <IosSkeleton className="h-13 w-full rounded-ios-xl" />
        <div className="flex flex-col gap-1.5 px-5 pt-2.5">
          <IosSkeleton className="h-3 w-full" />
          <IosSkeleton className="h-3 w-4/5" />
        </div>
      </div>
      <IosSkeleton className="h-12.5 w-full rounded-full" />
    </div>
  );
}
