"use client";

import { flushSync } from "react-dom";

export type IosStackDirection = "forward" | "back" | "none";

interface IosStackTransitionOptions {
  commit: () => void;
  direction: IosStackDirection;
  narrowScreensOnly: boolean;
  transitionName: string;
}

const navigationEasing = "cubic-bezier(0.32, 0.72, 0, 1)";
const navigationDuration = 420;

function shouldAnimate(narrowScreensOnly: boolean) {
  return (
    typeof document.startViewTransition === "function" &&
    (!narrowScreensOnly || window.matchMedia("(max-width: 767px)").matches) &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Runs a route change inside a view transition and animates it like a UINavigationController
 * push or pop: the incoming screen slides over while the outgoing one moves away in parallax.
 */
export function runIosStackTransition({
  commit,
  direction,
  narrowScreensOnly,
  transitionName,
}: IosStackTransitionOptions) {
  if (direction === "none" || !shouldAnimate(narrowScreensOnly)) {
    commit();
    return;
  }
  const transition = document.startViewTransition(function updateRoute() {
    flushSync(commit);
  });
  void animateStack(transition, direction, transitionName);
}

async function animateStack(
  transition: ViewTransition,
  direction: "forward" | "back",
  transitionName: string,
) {
  try {
    await transition.ready;
  } catch {
    // A skipped transition still applies the route change.
    return;
  }
  const isForward = direction === "forward";
  const timing = {
    duration: navigationDuration,
    easing: navigationEasing,
    fill: "both" as const,
  };
  document.documentElement.animate(
    {
      transform: isForward
        ? ["translateX(0)", "translateX(-30%)"]
        : ["translateX(0)", "translateX(100%)"],
      opacity: [1, 1],
      mixBlendMode: ["normal", "normal"],
      zIndex: isForward ? [0, 0] : [1, 1],
      filter: isForward
        ? ["brightness(1)", "brightness(0.92)"]
        : ["brightness(1)", "brightness(1)"],
    },
    { ...timing, pseudoElement: `::view-transition-old(${transitionName})` },
  );
  document.documentElement.animate(
    {
      transform: isForward
        ? ["translateX(100%)", "translateX(0)"]
        : ["translateX(-30%)", "translateX(0)"],
      opacity: [1, 1],
      mixBlendMode: ["normal", "normal"],
      zIndex: isForward ? [1, 1] : [0, 0],
      filter: isForward
        ? ["brightness(1)", "brightness(1)"]
        : ["brightness(0.92)", "brightness(1)"],
      boxShadow: isForward
        ? ["-8px 0 24px rgb(0 0 0 / 0.12)", "-8px 0 24px rgb(0 0 0 / 0.12)"]
        : ["none", "none"],
    },
    { ...timing, pseudoElement: `::view-transition-new(${transitionName})` },
  );
}
