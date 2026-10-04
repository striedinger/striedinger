import { Text } from "@workspace/ui/components/text";

import { iosGlassClassName } from "../../../components/ios/ios-glass";
import { IosSkeleton } from "../../../components/ios/ios-skeleton";

interface NotesSkeletonProps {
  /** The folder list's title, shown right away so the screen paints before notes load. */
  title?: string;
}

/**
 * The Notes folder list with shimmering placeholders while notes load from the device. On wide
 * screens it takes the floating sidebar's shape so the layout does not jump once notes load.
 */
export function NotesSkeleton({ title }: NotesSkeletonProps) {
  return (
    <div
      aria-busy="true"
      className="relative flex size-full flex-col gap-5 bg-ios-grouped-background px-4 pt-safe-plus-16 md:m-2 md:h-[calc(100%-1rem)] md:w-76 md:shrink-0 md:rounded-ios-2xl md:bg-ios-secondary-background md:shadow-ios-panel lg:w-68"
    >
      {title ? (
        <Text
          as="span"
          aria-hidden="true"
          className="h-9 text-ios-large-title font-bold text-ios-label"
        >
          {title}
        </Text>
      ) : (
        <IosSkeleton className="h-9 w-36" />
      )}
      <IosSkeleton className="mt-2 h-6 w-44" />
      <div className="flex flex-col gap-px overflow-hidden rounded-ios-xl">
        <IosSkeleton className="h-13 rounded-none" />
        <IosSkeleton className="h-13 rounded-none" />
      </div>
      <div className="absolute inset-x-4 bottom-safe-min-3.5 flex gap-2.5">
        <span className={`size-11 rounded-full ${iosGlassClassName}`} />
        <span className={`h-11 flex-1 rounded-full md:hidden ${iosGlassClassName}`} />
        <span className={`size-11 rounded-full md:hidden ${iosGlassClassName}`} />
      </div>
    </div>
  );
}
