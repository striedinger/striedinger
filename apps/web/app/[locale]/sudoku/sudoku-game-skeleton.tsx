import { IosSkeleton } from "../../../components/ios/ios-skeleton";

const keys = Array.from({ length: 10 }, function createKey(_, index) {
  return index;
});

/** Today's puzzle in placeholder form while it is chosen, laid out like the game. */
export function SudokuGameSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" aria-hidden="true">
      <IosSkeleton className="-mt-2.5 h-5 w-40" />
      <IosSkeleton className="h-9 shrink-0 rounded-ios-md" />
      <div className="flex h-14 shrink-0 gap-2.5">
        <IosSkeleton className="h-full flex-1 rounded-ios-lg" />
        <IosSkeleton className="h-full flex-1 rounded-ios-lg" />
      </div>
      <div className="[container-type:size] flex min-h-0 flex-1 items-center justify-center">
        <IosSkeleton className="aspect-square w-[min(100cqw,100cqh)] rounded-ios-xl" />
      </div>
      <div className="grid shrink-0 grid-cols-5 gap-2">
        {keys.map(function renderKey(key) {
          return (
            <IosSkeleton key={key} className="h-[clamp(2.75rem,6.5dvh,3.5rem)] rounded-ios-lg" />
          );
        })}
      </div>
    </div>
  );
}
