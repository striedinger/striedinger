"use client";

import { useState } from "react";

/**
 * Becomes true the first time `open` is true and stays true, so on-demand popups mount when
 * first needed and remain mounted for their closing animation.
 */
export function useHasOpened(open: boolean) {
  const [hasOpened, setHasOpened] = useState(open);
  if (open && !hasOpened) setHasOpened(true);
  return hasOpened || open;
}
