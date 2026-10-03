"use client";

import { useEffect } from "react";

/**
 * Publishes how much of the element the software keyboard covers as `--keyboard-inset`, so
 * bottom toolbars can ride on top of the keyboard like an iOS input accessory view and drop
 * the home indicator inset it hides. Safari keeps the layout viewport when the keyboard opens
 * and may pan the visual viewport, so the covered height is measured from the element's own
 * bottom edge rather than from the window height. The value is written straight to the DOM
 * so nothing re-renders while the keyboard animates.
 */
export function useKeyboardInset(target: HTMLElement | null) {
  useEffect(
    function trackVisualViewport() {
      const viewport = window.visualViewport;
      if (!target || !viewport) return;
      const element: HTMLElement = target;
      const visualViewport: VisualViewport = viewport;
      let frame = 0;

      function updateInset() {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(function writeInset() {
          const visibleBottom = visualViewport.offsetTop + visualViewport.height;
          const inset = Math.max(0, element.getBoundingClientRect().bottom - visibleBottom);
          element.style.setProperty("--keyboard-inset", `${Math.round(inset)}px`);
        });
      }

      visualViewport.addEventListener("resize", updateInset);
      visualViewport.addEventListener("scroll", updateInset);
      updateInset();
      return function stopTrackingVisualViewport() {
        cancelAnimationFrame(frame);
        visualViewport.removeEventListener("resize", updateInset);
        visualViewport.removeEventListener("scroll", updateInset);
        element.style.removeProperty("--keyboard-inset");
      };
    },
    [target],
  );
}
