"use client";

import { createContext, useContext } from "react";

// Popups render inside the app frame so they inherit its iOS color tokens and typography.
export const IosPortalContainerContext = createContext<HTMLElement | null>(null);

/** Returns the app frame, or undefined so popups fall back to the document body outside it. */
export function useIosPortalContainer() {
  return useContext(IosPortalContainerContext) ?? undefined;
}
