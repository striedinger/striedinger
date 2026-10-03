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
      className="-mt-11 flex flex-col items-center gap-4 bg-[#3a3a3c] px-6 pt-16 pb-6 text-center text-white transition-[background-color] duration-500 motion-reduce:transition-none"
      style={artworkColor ? { backgroundColor: artworkColor } : undefined}
    >
      <PodcastArtwork
        src={artworkUrl}
        sizes="(min-width: 768px) 240px, 200px"
        priority
        className="w-[200px] rounded-xl shadow-[0_12px_32px_rgb(0_0_0/0.35)] md:w-[240px]"
      />
      {children}
    </div>
  );
}
