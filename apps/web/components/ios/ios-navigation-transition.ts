// Next.js runs this with React canary; stable React used by unit tests has no transition types.
import { addTransitionType } from "react";

export type IosNavigationDirection = "forward" | "back";

const navigationTypes: Record<IosNavigationDirection, string> = {
  forward: "ios-nav-forward",
  back: "ios-nav-back",
};

/**
 * Tags the current transition as a navigation push or pop, which `IosScreenTransition`
 * boundaries animate like a UINavigationController. Call it inside `startTransition`, or in
 * the same event before a transition that another library starts.
 */
export function addIosNavigationType(direction: IosNavigationDirection) {
  if (!addTransitionType) return;
  addTransitionType(navigationTypes[direction]);
}
