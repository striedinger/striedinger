"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Keeps a screen's scroll position while Next.js hides it between navigations. Routes the
 * user leaves stay mounted inside a hidden `<Activity>`, which tears down layout effects as
 * the screen hides and runs them again before it reappears, so the position is saved and
 * restored around that boundary. Browsers otherwise reset scroll offsets for hidden content.
 */
export function useScreenScrollRestoration<Element extends HTMLElement = HTMLDivElement>() {
  const scrollerRef = useRef<Element>(null);
  const savedPositionRef = useRef(0);

  useLayoutEffect(function restoreScrollPosition() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (savedPositionRef.current > 0) scroller.scrollTop = savedPositionRef.current;
    return function saveScrollPosition() {
      savedPositionRef.current = scroller.scrollTop;
    };
  }, []);

  return scrollerRef;
}
