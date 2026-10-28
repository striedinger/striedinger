import { cn } from "@workspace/ui/lib/utils";

import { IosSkeleton } from "../../../components/ios/ios-skeleton";
import {
  nowPlayingArtworkClassName,
  nowPlayingDetailsClassName,
  nowPlayingFrameClassName,
  nowPlayingPlatterClassName,
  nowPlayingSubtitleClassName,
  nowPlayingTitleClassName,
} from "./now-playing-layout";

/**
 * The Now Playing platter while Spotify answers, built from the card's own geometry so the
 * cover, the lines of text, and the button sit exactly where the loaded card puts them.
 */
export function NowPlayingSkeleton() {
  return (
    <div aria-busy="true" className={cn(nowPlayingFrameClassName, "bg-ios-secondary-background")}>
      <div className={nowPlayingPlatterClassName}>
        <IosSkeleton className={nowPlayingArtworkClassName} />
        <div className={nowPlayingDetailsClassName}>
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex h-4 items-center">
              <IosSkeleton className="h-3 w-2/5 rounded-full" />
            </div>
            <div className={cn(nowPlayingTitleClassName, "flex h-lh items-center")}>
              <IosSkeleton className="h-[0.8em] w-3/4 rounded-full" />
            </div>
            <div className={cn(nowPlayingSubtitleClassName, "flex h-lh items-center")}>
              <IosSkeleton className="h-[0.8em] w-1/2 rounded-full" />
            </div>
          </div>
          {/* The scrubber and its two times, as PlaybackProgress lays them out. */}
          <div className="flex flex-col gap-1.5">
            <IosSkeleton className="h-1.25 w-full rounded-full" />
            <div className="flex h-3.25 justify-between">
              <IosSkeleton className="h-full w-7 rounded-full" />
              <IosSkeleton className="h-full w-8 rounded-full" />
            </div>
          </div>
          <IosSkeleton className="h-7.5 w-36 rounded-full" />
        </div>
      </div>
    </div>
  );
}
