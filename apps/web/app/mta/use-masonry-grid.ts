"use client";

import { useEffect, useRef, type RefObject } from "react";

export function useMasonryGrid(layoutKey: string): RefObject<HTMLDivElement | null> {
  const gridElement = useRef<HTMLDivElement>(null);

  useEffect(
    function measureMasonryItems() {
      const grid = gridElement.current;
      if (!grid || typeof ResizeObserver === "undefined") return;
      const masonryGrid = grid;

      const masonryItems = Array.from(
        masonryGrid.querySelectorAll<HTMLElement>("[data-masonry-item]"),
      );
      let animationFrameId: number | undefined;

      function applyMasonryLayout() {
        masonryGrid.style.gridAutoRows = "1px";
        masonryGrid.style.rowGap = "0px";

        for (const masonryItem of masonryItems) masonryItem.style.paddingBottom = "1rem";
        const rowSpans = masonryItems.map(function measureMasonryItem(masonryItem) {
          return Math.ceil(masonryItem.getBoundingClientRect().height);
        });
        masonryItems.forEach(function setMasonryItemSpan(masonryItem, itemIndex) {
          masonryItem.style.gridRowEnd = `span ${rowSpans[itemIndex]}`;
        });
      }

      function scheduleMasonryLayout() {
        if (animationFrameId !== undefined) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(applyMasonryLayout);
      }

      const resizeObserver = new ResizeObserver(scheduleMasonryLayout);
      for (const masonryItem of masonryItems) resizeObserver.observe(masonryItem);
      scheduleMasonryLayout();

      return function stopMeasuringMasonryItems() {
        resizeObserver.disconnect();
        if (animationFrameId !== undefined) cancelAnimationFrame(animationFrameId);
        masonryGrid.style.removeProperty("grid-auto-rows");
        masonryGrid.style.removeProperty("row-gap");
        for (const masonryItem of masonryItems) {
          masonryItem.style.removeProperty("grid-row-end");
          masonryItem.style.removeProperty("padding-bottom");
        }
      };
    },
    [layoutKey],
  );

  return gridElement;
}
