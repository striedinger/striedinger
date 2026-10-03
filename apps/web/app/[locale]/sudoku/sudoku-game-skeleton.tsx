import { IosSkeleton } from "../../../components/ios/ios-skeleton";

const keys = Array.from({ length: 10 }, function createKey(_, index) {
  return index;
});

/** Today's puzzle in placeholder form while it is chosen. */
export function SudokuGameSkeleton() {
  return (
    <div className="flex flex-col gap-4 pb-4" aria-hidden="true">
      <IosSkeleton className="-mt-2 h-5 w-40" />
      <IosSkeleton className="h-9 rounded-[10px]" />
      <div className="flex gap-3">
        <IosSkeleton className="h-[74px] flex-1 rounded-[18px]" />
        <IosSkeleton className="h-[74px] flex-1 rounded-[18px]" />
      </div>
      <IosSkeleton className="aspect-square w-full rounded-[22px]" />
      <div className="grid grid-cols-5 gap-2">
        {keys.map(function renderKey(key) {
          return <IosSkeleton key={key} className="h-14 rounded-[14px]" />;
        })}
      </div>
    </div>
  );
}
