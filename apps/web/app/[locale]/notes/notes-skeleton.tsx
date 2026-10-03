import { Text } from "@workspace/ui/components/text";

import { iosGlassClassName } from "../../../components/ios/ios-glass";
import { IosSkeleton } from "../../../components/ios/ios-skeleton";

interface NotesSkeletonProps {
  /** The folder list's title, shown right away so the screen paints before notes load. */
  title?: string;
}

/** The Notes folder list with shimmering placeholders while notes load from the device. */
export function NotesSkeleton({ title }: NotesSkeletonProps) {
  return (
    <div
      aria-busy="true"
      className="relative flex size-full flex-col gap-5 bg-(--ios-grouped-background) px-4 pt-[calc(4rem+env(safe-area-inset-top))]"
    >
      {title ? (
        <Text
          as="span"
          aria-hidden="true"
          className="h-9 text-[34px] leading-[41px] font-bold tracking-[0.4px] text-(--ios-label)"
        >
          {title}
        </Text>
      ) : (
        <IosSkeleton className="h-9 w-36" />
      )}
      <IosSkeleton className="mt-2 h-6 w-44" />
      <div className="flex flex-col gap-px overflow-hidden rounded-[22px]">
        <IosSkeleton className="h-[52px] rounded-none" />
        <IosSkeleton className="h-[52px] rounded-none" />
      </div>
      <div className="absolute inset-x-4 bottom-[max(env(safe-area-inset-bottom),14px)] flex gap-2.5">
        <span className={`size-11 rounded-full ${iosGlassClassName}`} />
        <span className={`h-11 flex-1 rounded-full ${iosGlassClassName}`} />
        <span className={`size-11 rounded-full ${iosGlassClassName}`} />
      </div>
    </div>
  );
}
