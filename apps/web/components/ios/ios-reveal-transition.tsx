"use client";

import type { ReactNode } from "react";

import { useState } from "react";

interface IosRevealTransitionProps {
  children: ReactNode;
}

/**
 * Fades content in when it replaces a Suspense fallback. This is a CSS animation rather than
 * a view transition on purpose: content often streams in while a push or pop is still
 * sliding, and starting another view transition would cut that slide short. The fade runs
 * once; screens Next.js hides and shows again would otherwise replay it.
 */
export function IosRevealTransition({ children }: IosRevealTransitionProps) {
  const [hasRevealed, setHasRevealed] = useState(false);

  return (
    <div
      className={
        hasRevealed
          ? undefined
          : "animate-in duration-300 ease-out fade-in motion-reduce:animate-none"
      }
      onAnimationEnd={function finishReveal(event) {
        if (event.target === event.currentTarget) setHasRevealed(true);
      }}
    >
      {children}
    </div>
  );
}
