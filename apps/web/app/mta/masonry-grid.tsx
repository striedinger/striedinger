"use client";

import type { ReactNode } from "react";

import { useMasonryGrid } from "./use-masonry-grid";

interface MasonryGridProps {
  children: ReactNode;
  layoutKey: string;
}

export function MasonryGrid({ children, layoutKey }: MasonryGridProps) {
  const gridElement = useMasonryGrid(layoutKey);

  return (
    <div ref={gridElement} className="grid grid-flow-row-dense items-start gap-4 lg:grid-cols-2">
      {children}
    </div>
  );
}
