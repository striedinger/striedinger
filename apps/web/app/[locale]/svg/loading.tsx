import { IosSkeleton } from "../../../components/ios/ios-skeleton";

export default function SvgLoading() {
  return (
    <div aria-busy="true" className="grid gap-6 lg:grid-cols-2 lg:gap-5">
      {["code", "preview"].map(function renderPanePlaceholder(name) {
        return (
          <div key={name} className="flex min-w-0 flex-col">
            <div className="flex min-h-9 items-end px-5 pb-1.5">
              <IosSkeleton className="h-4 w-24" />
            </div>
            <div className="flex flex-col gap-3">
              <IosSkeleton className="h-88 w-full rounded-ios-xl lg:h-128" />
              <IosSkeleton className="h-9 w-full rounded-full" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
