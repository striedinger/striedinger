import { IosSkeleton } from "../../../components/ios/ios-skeleton";

const stations = [0, 1, 2];
const arrivals = [0, 1, 2, 3];
const bullets = [0, 1, 2, 3, 4, 5, 6, 7];

/** Nearby stations in placeholder form while live arrivals load. */
export function MtaDashboardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4 pt-1">
      <div className="flex items-end justify-between px-4">
        <div className="flex flex-col gap-1.5">
          <IosSkeleton className="h-3.5 w-24" />
          <IosSkeleton className="h-6 w-44" />
        </div>
        <IosSkeleton className="size-11 rounded-full" />
      </div>
      <div className="flex gap-1.5 overflow-hidden px-4 py-1">
        <IosSkeleton className="h-9 w-24 shrink-0 rounded-full" />
        {bullets.map(function renderBullet(bullet) {
          return <IosSkeleton key={bullet} className="size-9 shrink-0 rounded-full" />;
        })}
      </div>
      <div className="gap-4 px-4 lg:columns-2">
        {stations.map(function renderStation(station) {
          return (
            <div
              key={station}
              className="mb-4 flex flex-col gap-3 rounded-ios-xl bg-ios-grouped-cell p-4"
            >
              <IosSkeleton className="h-5 w-40" />
              {arrivals.map(function renderArrival(arrival) {
                return (
                  <div key={arrival} className="flex items-center gap-3">
                    <IosSkeleton className="size-8 shrink-0 rounded-full" />
                    <div className="flex flex-1 flex-col gap-1.5">
                      <IosSkeleton className="h-4 w-3/5" />
                      <IosSkeleton className="h-3 w-1/4" />
                    </div>
                    <IosSkeleton className="h-5 w-12" />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
