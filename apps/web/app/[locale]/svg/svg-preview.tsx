import type { ReactNode } from "react";

import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

import type { SvgPreviewBackground } from "./types";

import { createSvgDataUrl } from "./export-svg-png";

interface SvgPreviewProps {
  /** A control floating in the corner, such as the background menu. */
  accessory: ReactNode;
  background: SvgPreviewBackground;
  emptyLabel: string;
  isStale: boolean;
  label: string;
  source: string | null;
}

/**
 * A Quick Look canvas that shows the SVG as an image rather than inline markup, so pasted
 * scripts, event handlers, and external references never run or load.
 */
export function SvgPreview({
  accessory,
  background,
  emptyLabel,
  isStale,
  label,
  source,
}: SvgPreviewProps) {
  return (
    <div
      className={cn(
        "relative h-72 overflow-hidden rounded-ios-2xl transition-colors duration-300 motion-reduce:transition-none sm:h-96 lg:h-full",
        background === "grid" && "bg-ios-checkerboard",
        background === "light" && "bg-white",
        background === "dark" && "bg-black",
      )}
    >
      <div
        data-stale={isStale ? "" : undefined}
        className="flex size-full items-center justify-center p-8 transition-opacity duration-200 data-stale:opacity-50 motion-reduce:transition-none"
      >
        {source ? (
          // Always a data URL, even for large drawings: opening a same-origin blob: URL in a
          // new tab would run the SVG's scripts on this site, while a data URL has an opaque
          // origin and browsers refuse to navigate to it. Encoding happens once per deferred
          // source, about 50 ms for 5 MB. next/image cannot load data URLs.
          // oxlint-disable-next-line nextjs/no-img-element
          <img
            alt={label}
            src={createSvgDataUrl(source)}
            className="size-full object-contain drop-shadow-sm"
            draggable={false}
          />
        ) : (
          <Text className="max-w-xs text-center text-ios-subheadline text-ios-secondary-label">
            {emptyLabel}
          </Text>
        )}
      </div>
      <div className="absolute top-3 right-3">{accessory}</div>
    </div>
  );
}
