"use client";

import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";
import { useState } from "react";

interface IosRevealTransitionProps {
  children: ReactNode;
  /** Sizes the wrapper, such as `size-full` for content that fills its frame. */
  className?: string;
}

/**
 * Fades content in when it replaces a Suspense fallback. This is a CSS animation rather than
 * a view transition on purpose: content often streams in while a push or pop is still
 * sliding, and starting another view transition would cut that slide short. The fade runs
 * once; screens Next.js hides and shows again would otherwise replay it.
 */
export function IosRevealTransition({ children, className }: IosRevealTransitionProps) {
  const [hasRevealed, setHasRevealed] = useState(false);

  return (
    <div
      className={cn(
        className,
        !hasRevealed && "animate-in duration-300 ease-out fade-in motion-reduce:animate-none",
      )}
      onAnimationEnd={function finishReveal(event) {
        if (event.target === event.currentTarget) setHasRevealed(true);
      }}
    >
      {children}
    </div>
  );
}
