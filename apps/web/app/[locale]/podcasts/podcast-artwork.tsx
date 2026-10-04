"use client";

import { cn } from "@workspace/ui/lib/utils";
import Image from "next/image";
import { useState } from "react";

interface PodcastArtworkProps {
  alt?: string;
  className?: string;
  priority?: boolean;
  sizes: string;
  src: string;
}

/**
 * Square show artwork with the hairline border and continuous corners used across Podcasts.
 * Artwork fades in once decoded instead of popping in over the placeholder.
 */
export function PodcastArtwork({
  alt = "",
  className,
  priority = false,
  sizes,
  src,
}: PodcastArtworkProps) {
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const isLoaded = priority || loadedSource === src;

  return (
    <span
      className={cn(
        "bg-ios-tertiary-fill relative block aspect-square shrink-0 overflow-hidden rounded-lg after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:border-[0.5px] after:border-black/10 dark:after:border-white/10",
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        quality={75}
        priority={priority}
        className={cn(
          "object-cover transition-opacity duration-300 motion-reduce:transition-none",
          isLoaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={function revealArtwork() {
          setLoadedSource(src);
        }}
      />
    </span>
  );
}
