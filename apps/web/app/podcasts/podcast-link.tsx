"use client";

import type { ComponentPropsWithRef, MouseEvent } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";

type PodcastLinkProps = Omit<ComponentPropsWithRef<typeof Link>, "href" | "onClick"> & {
  href: string;
  onOpen: () => void;
};

type RouterPrefetchOptions = Parameters<ReturnType<typeof useRouter>["prefetch"]>[1];

const fullPrefetch = { kind: "full" } as RouterPrefetchOptions;

/**
 * A real link for show and episode destinations that hands ordinary clicks to the app so it
 * can animate the push and render the destination optimistically. Modified clicks still open
 * a new tab the way links normally do. The destination's live data starts loading as soon as
 * a finger touches down or a pointer hovers, so most pushes arrive with episodes ready.
 */
export function PodcastLink({ children, href, onOpen, ...props }: PodcastLinkProps) {
  const router = useRouter();
  const hasPrefetchedRef = useRef(false);

  function prefetchDestination() {
    if (hasPrefetchedRef.current) return;
    hasPrefetchedRef.current = true;
    router.prefetch(href, fullPrefetch);
  }

  return (
    <Link
      scroll={false}
      {...props}
      href={href}
      onPointerEnter={prefetchDestination}
      onTouchStart={prefetchDestination}
      onFocus={prefetchDestination}
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
