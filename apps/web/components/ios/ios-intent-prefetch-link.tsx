"use client";

import type { ComponentPropsWithRef } from "react";

import Link from "next/link";
import { useState } from "react";

type IosIntentPrefetchLinkProps = Omit<ComponentPropsWithRef<typeof Link>, "prefetch">;

/**
 * A link that prefetches its route only once someone shows intent: a hover, a touch, or
 * keyboard focus. Lists that show many links at once, such as the app switcher, would
 * otherwise prefetch every route the moment they appear, flooding a phone's network and main
 * thread just as the list animates in.
 */
export function IosIntentPrefetchLink({
  children,
  onFocus,
  onPointerEnter,
  onTouchStart,
  ...props
}: IosIntentPrefetchLinkProps) {
  const [hasIntent, setHasIntent] = useState(false);

  return (
    <Link
      {...props}
      // `null` restores the default prefetch once intent is shown; `false` holds it off.
      prefetch={hasIntent ? null : false}
      onFocus={function prefetchOnFocus(event) {
        setHasIntent(true);
        onFocus?.(event);
      }}
      onPointerEnter={function prefetchOnHover(event) {
        setHasIntent(true);
        onPointerEnter?.(event);
      }}
      onTouchStart={function prefetchOnTouch(event) {
        setHasIntent(true);
        onTouchStart?.(event);
      }}
    >
      {children}
    </Link>
  );
}
