"use client";

import type { ComponentPropsWithRef, MouseEvent } from "react";

import Link from "next/link";

type PodcastLinkProps = Omit<ComponentPropsWithRef<typeof Link>, "onClick"> & {
  onOpen: () => void;
};

/**
 * A real link for show and episode destinations that hands ordinary clicks to the app so it
 * can animate the push and render the destination optimistically. Modified clicks still open
 * a new tab the way links normally do.
 */
export function PodcastLink({ children, href, onOpen, ...props }: PodcastLinkProps) {
  return (
    <Link
      scroll={false}
      {...props}
      href={href}
      onClick={function openInApp(event: MouseEvent<HTMLAnchorElement>) {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
          return;
        event.preventDefault();
        onOpen();
      }}
    >
      {children}
    </Link>
  );
}
