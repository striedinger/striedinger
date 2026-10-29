import type { ReactNode } from "react";

/** Whether an optional slot was given something to show, so its wrapper can be left out. */
export function hasContent(node: ReactNode) {
  return node !== null && node !== undefined && node !== false && node !== "" && node !== 0;
}
