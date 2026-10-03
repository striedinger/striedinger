import { LockIcon } from "@workspace/icons/lock-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

import type { DropLabels } from "./types";

interface DropRadarProps {
  connectionError: boolean;
  labels: DropLabels;
  peerCount: number;
}

const rings = ["[animation-delay:0ms]", "[animation-delay:800ms]", "[animation-delay:1600ms]"];

/**
 * The AirDrop-style radar: rings ripple out from the device while it waits for a peer and
 * settle into a solid tint once another device connects.
 */
export function DropRadar({ connectionError, labels, peerCount }: DropRadarProps) {
  const isConnected = peerCount > 0;
  const status =
    peerCount === 0
      ? labels.noPeers
      : peerCount === 1
        ? labels.onePeer
        : labels.peers.replace("{count}", String(peerCount));

  return (
    <section
      aria-label={labels.encrypted}
      className="flex flex-col items-center gap-4 px-6 pt-2 pb-6 text-center"
    >
      <div className="relative flex size-44 items-center justify-center" aria-hidden="true">
        {isConnected
          ? null
          : rings.map(function renderRing(delayClassName) {
              return (
                <span
                  key={delayClassName}
                  className={cn(
                    "absolute inset-8 animate-ping rounded-full border border-(--ios-tint)/50 bg-(--ios-tint)/10 [animation-duration:2.4s] motion-reduce:hidden",
                    delayClassName,
                  )}
                />
              );
            })}
        <span
          className={cn(
            "absolute inset-8 rounded-full transition-colors duration-500 motion-reduce:transition-none",
            isConnected ? "bg-(--ios-tint)/15" : "bg-(--ios-fill)",
          )}
        />
        <span
          className={cn(
            "relative flex size-20 items-center justify-center rounded-full text-white shadow-[0_10px_30px_rgb(0_0_0/0.18)] transition-colors duration-500 motion-reduce:transition-none [&_svg]:size-8",
            isConnected ? "bg-(--ios-green)" : "bg-(--ios-tint)",
          )}
        >
          <LockIcon />
        </span>
      </div>
      <div className="flex flex-col gap-1" role="status" aria-live="polite" aria-atomic="true">
        <Text className="text-[20px] leading-[25px] font-semibold tracking-[0.38px] text-(--ios-label)">
          {status}
        </Text>
        <Text className="text-[15px] leading-5 tracking-[-0.23px] text-(--ios-secondary-label)">
          {labels.encrypted}
        </Text>
      </div>
      {connectionError ? (
        <Text role="alert" className="max-w-xs text-[15px] leading-5 text-(--ios-red)">
          {labels.roomError}
        </Text>
      ) : null}
    </section>
  );
}
