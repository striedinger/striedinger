import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

import type { SvgPreviewBackground } from "./types";

import { createSvgDataUrl } from "./export-svg-png";

interface SvgPreviewProps {
  background: SvgPreviewBackground;
  emptyLabel: string;
  isStale: boolean;
  label: string;
  source: string | null;
}

/**
 * Shows the SVG as an image rather than inline markup, so pasted scripts, event handlers,
 * and external references never run or load.
 */
export function SvgPreview({ background, emptyLabel, isStale, label, source }: SvgPreviewProps) {
  return (
    <div
      data-stale={isStale ? "" : undefined}
      className={cn(
        "flex h-88 items-center justify-center overflow-hidden rounded-ios-xl p-6 transition-[opacity,background-color] duration-200 data-stale:opacity-60 motion-reduce:transition-none lg:h-128",
        background === "grid" && "bg-ios-checkerboard",
        background === "light" && "bg-white",
        background === "dark" && "bg-black",
      )}
    >
      {source ? (
        // A data URL keeps the preview sandboxed as an image; next/image cannot load it.
        // oxlint-disable-next-line nextjs/no-img-element
        <img
          alt={label}
          src={createSvgDataUrl(source)}
          className="size-full object-contain"
          draggable={false}
        />
      ) : (
        <Text className="max-w-xs text-center text-ios-subheadline text-ios-secondary-label">
          {emptyLabel}
        </Text>
      )}
    </div>
  );
}
