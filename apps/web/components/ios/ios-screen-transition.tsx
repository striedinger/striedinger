import type { ReactNode } from "react";

// Next.js runs these with React canary; stable React used by unit tests has no ViewTransition.
import { ViewTransition } from "react";

const screenTransitionClasses = {
  "ios-nav-forward": "ios-nav-forward",
  "ios-nav-back": "ios-nav-back",
  default: "none",
};

interface IosScreenTransitionProps {
  children: ReactNode;
}

/**
 * A navigation screen that slides like a UINavigationController push or pop when the
 * transition that changes it carries an `addIosNavigationType` direction. Other updates, such
 * as tab switches and data arriving, render without animation.
 */
export function IosScreenTransition({ children }: IosScreenTransitionProps) {
  if (!ViewTransition) return children;
  return (
    <ViewTransition
      default="none"
      enter={screenTransitionClasses}
      exit={screenTransitionClasses}
      update={screenTransitionClasses}
    >
      {children}
    </ViewTransition>
  );
}
