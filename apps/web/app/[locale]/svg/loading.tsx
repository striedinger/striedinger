import { IosSkeleton } from "../../../components/ios/ios-skeleton";

const detailRows = ["dimensions", "size", "elements"];

/** The preview, code, and details sections in placeholder form, in the editor's layout. */
export default function SvgLoading() {
  return (
    <div
      aria-busy="true"
      className="grid gap-6 pb-20 lg:h-[max(36rem,calc(100dvh-12rem))] lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-x-5"
    >
      <div className="flex min-h-0 flex-col lg:col-start-2">
        <div className="flex min-h-9 items-end px-5 pb-1.5">
          <IosSkeleton className="h-4 w-20" />
        </div>
        <IosSkeleton className="h-72 rounded-ios-2xl sm:h-96 lg:h-full" />
      </div>
      <div className="flex min-h-0 flex-col lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <div className="flex min-h-9 items-end px-5 pb-1.5">
          <IosSkeleton className="h-4 w-24" />
        </div>
        <IosSkeleton className="h-80 rounded-ios-xl lg:h-full" />
      </div>
      <div className="flex flex-col lg:col-start-2">
        <div className="flex min-h-9 items-end px-5 pb-1.5">
          <IosSkeleton className="h-4 w-16" />
        </div>
        <div className="flex flex-col gap-px overflow-hidden rounded-ios-xl">
          {detailRows.map(function renderRow(row) {
            return <IosSkeleton key={row} className="h-11 rounded-none" />;
          })}
        </div>
      </div>
    </div>
  );
}
