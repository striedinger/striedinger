export type IosNavigationDirection = "forward" | "back";

/**
 * Transition types for a navigation push or pop. Passed to Next.js navigations, they make
 * `IosScreenTransition` boundaries slide like a UINavigationController.
 */
export const iosNavigationTypes: Record<IosNavigationDirection, string> = {
  forward: "ios-nav-forward",
  back: "ios-nav-back",
};
