import { cn } from "@workspace/ui/lib/utils";

interface EqualizerBarsProps {
  isPlaying: boolean;
}

// Staggered so the bars never move together.
const barDelays = [
  "[animation-delay:-0.45s]",
  "[animation-delay:-0.15s]",
  "[animation-delay:-0.7s]",
  "",
];

/** The bouncing bars beside a song that is playing, resting low while it is paused. */
export function EqualizerBars({ isPlaying }: EqualizerBarsProps) {
  return (
    <span aria-hidden="true" className="flex h-3 items-end gap-0.5">
      {barDelays.map(function renderBar(delayClassName) {
        return (
          <span
            key={delayClassName || "undelayed"}
            className={cn(
              "h-full w-0.75 origin-bottom rounded-full",
              isPlaying
                ? cn("animate-ios-equalizer bg-ios-tint motion-reduce:animate-none", delayClassName)
                : "scale-y-30 bg-ios-tertiary-label",
            )}
          />
        );
      })}
    </span>
  );
}
