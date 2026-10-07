import { ViewTransition, type ReactNode } from "react";

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
