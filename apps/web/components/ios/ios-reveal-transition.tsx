import type { ReactNode } from "react";

// Next.js runs these with React canary; stable React used by unit tests has no ViewTransition.
import { ViewTransition } from "react";

interface IosRevealTransitionProps {
  children: ReactNode;
}

/** Fades content in when it replaces a Suspense fallback, and fades the fallback out. */
export function IosRevealTransition({ children }: IosRevealTransitionProps) {
  if (!ViewTransition) return children;
  return (
    <ViewTransition default="none" enter="ios-reveal" exit="ios-reveal">
      {children}
    </ViewTransition>
  );
}
