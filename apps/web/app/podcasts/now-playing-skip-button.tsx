import { GoBackwardIcon } from "@workspace/icons/go-backward-icon";
import { GoForwardIcon } from "@workspace/icons/go-forward-icon";

interface NowPlayingSkipButtonProps {
  direction: "backward" | "forward";
  label: string;
  onSkip: () => void;
  seconds: number;
}

export function NowPlayingSkipButton({
  direction,
  label,
  onSkip,
  seconds,
}: NowPlayingSkipButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className="relative flex size-16 items-center justify-center rounded-full text-white outline-none focus-visible:bg-white/10 active:scale-90 active:opacity-60 motion-safe:transition-transform"
      onClick={onSkip}
    >
      {direction === "backward" ? (
        <GoBackwardIcon className="size-10" strokeWidth={1.8} />
      ) : (
        <GoForwardIcon className="size-10" strokeWidth={1.8} />
      )}
      <span
        aria-hidden="true"
        className="absolute pt-1 text-[12px] leading-none font-bold tabular-nums"
      >
        {seconds}
      </span>
    </button>
  );
}
