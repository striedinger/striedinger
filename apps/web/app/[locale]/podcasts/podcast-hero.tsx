"use client";

import type { ReactNode } from "react";

import { PodcastArtwork } from "./podcast-artwork";
import { useArtworkColor } from "./use-artwork-color";

interface PodcastHeroProps {
  artworkUrl: string;
  children: ReactNode;
}

/** The artwork-tinted header that opens show and episode pages. */
export function PodcastHero({ artworkUrl, children }: PodcastHeroProps) {
  const artworkColor = useArtworkColor(artworkUrl);

  return (
    <div
      className="-mt-[calc(3.5rem+env(safe-area-inset-top))] flex flex-col items-center gap-4 bg-ios-gray4-dark px-6 pt-safe-plus-20 pb-6 text-center text-white transition-[background-color] duration-500 motion-reduce:transition-none"
      style={artworkColor ? { backgroundColor: artworkColor } : undefined}
    >
      <PodcastArtwork
        src={artworkUrl}
        sizes="(min-width: 768px) 240px, 200px"
        priority
        className="w-50 rounded-xl shadow-ios-overlay md:w-60"
      />
      {children}
    </div>
  );
}
