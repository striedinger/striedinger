"use client";

import { useEffect, useState } from "react";

/**
 * For popups whose code loads the first time they open: reports closed for the first frame
 * after mounting, then follows `open`. The popup library then sees a real closed-to-open
 * change and plays its entry animation, which it skips for popups that mount already open.
 */
export function useOpenAfterMount(open: boolean) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(function markMountedAfterFirstFrame() {
    const frame = requestAnimationFrame(function markMounted() {
      setHasMounted(true);
    });
    return function cancelMountedMark() {
      cancelAnimationFrame(frame);
    };
  }, []);

  return hasMounted && open;
}
