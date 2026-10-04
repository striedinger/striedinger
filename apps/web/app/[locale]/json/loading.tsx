import { IosSkeleton } from "../../../components/ios/ios-skeleton";

export default function JsonLoading() {
  return (
    <div aria-busy="true" className="grid gap-6 lg:grid-cols-2 lg:gap-5">
      {["input", "preview"].map(function renderPanePlaceholder(name) {
        return (
          <div key={name} className="flex min-w-0 flex-col">
            <div className="flex min-h-9 items-end px-5 pb-1.5">
              <IosSkeleton className="h-4 w-24" />
            </div>
            <IosSkeleton className="h-[22rem] w-full rounded-[22px] lg:h-[32rem]" />
            <div className="flex flex-col gap-1.5 px-5 pt-2.5">
              <IosSkeleton className="h-3 w-4/5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
