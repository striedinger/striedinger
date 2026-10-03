"use client";

import { useEffect, type RefObject } from "react";

/**
 * Publishes the software keyboard's height as `--keyboard-inset` on the given element so the
 * editing toolbar can sit on top of the keyboard, like the iOS input accessory view. The value
 * is written straight to the DOM to avoid re-rendering the editor while the keyboard animates.
 */
export function useKeyboardInset(targetRef: RefObject<HTMLElement | null>) {
  useEffect(
    function trackVisualViewport() {
      const target = targetRef.current;
      const viewport = window.visualViewport;
      if (!target || !viewport) return;
      const visualViewport: VisualViewport = viewport;
      let frame = 0;

      function updateInset() {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(function writeInset() {
          const inset = Math.max(
            0,
            window.innerHeight - visualViewport.height - visualViewport.offsetTop,
          );
          target?.style.setProperty("--keyboard-inset", `${Math.round(inset)}px`);
        });
      }

      visualViewport.addEventListener("resize", updateInset);
      visualViewport.addEventListener("scroll", updateInset);
      updateInset();
      return function stopTrackingVisualViewport() {
        cancelAnimationFrame(frame);
        visualViewport.removeEventListener("resize", updateInset);
        visualViewport.removeEventListener("scroll", updateInset);
        target.style.removeProperty("--keyboard-inset");
      };
    },
    [targetRef],
  );
}
