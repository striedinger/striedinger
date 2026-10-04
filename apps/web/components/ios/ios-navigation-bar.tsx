"use client";

import type { ReactNode } from "react";

import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useRef, useState } from "react";

type IosNavigationBarTitleDisplay = "large" | "inline" | "hidden" | "scroll-edge";

interface IosNavigationBarProps {
  accessory?: ReactNode;
  className?: string;
  leading?: ReactNode;
  subtitle?: string;
  title: string;
  titleDisplay?: IosNavigationBarTitleDisplay;
  /** Use `h2` when several screens share a page, such as side-by-side panes. */
  titleElement?: "h1" | "h2";
  trailing?: ReactNode;
}

/**
 * An iOS 26 navigation bar rendered inside an element marked with `data-ios-scroll`. The bar
 * has no opaque background: its glass buttons float over content, and a soft blurred scroll
 * edge fades in once content passes underneath. The large title collapses into the centered
 * inline title, observed with an intersection observer so scrolling stays on the compositor.
 * With `scroll-edge`, the inline title appears once the accessory has scrolled away.
 * Set `--ios-bar-edge` on the scroll container to match its background color, and
 * `--ios-content-width` to line the bar up with content centered in a column of that width.
 */
export function IosNavigationBar({
  accessory,
  className,
  leading,
  subtitle,
  title,
  titleDisplay = "large",
  titleElement = "h1",
  trailing,
}: IosNavigationBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isScrolledUnder, setIsScrolledUnder] = useState(false);
  const showsLargeTitle = titleDisplay === "large";
  const hidesTitle = titleDisplay === "hidden";

  useEffect(function observeScrollEdge() {
    const sentinel = sentinelRef.current;
    const bar = barRef.current;
    if (!sentinel || !bar || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      function updateScrollEdge([entry]) {
        // A hidden screen reports nothing intersecting; keep the state it had while visible
        // so the bar does not flash its scrolled appearance when the screen returns.
        if (!entry || !entry.rootBounds || entry.rootBounds.height === 0) return;
        setIsScrolledUnder(!entry.isIntersecting);
      },
      {
        root: sentinel.closest("[data-ios-scroll]"),
        rootMargin: `-${bar.offsetHeight}px 0px 0px 0px`,
      },
    );
    observer.observe(sentinel);
    return function stopObservingScrollEdge() {
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div
        ref={barRef}
        data-scrolled={isScrolledUnder || undefined}
        className={cn(
          "group/bar sticky top-0 z-20 grid h-[calc(3.5rem+env(safe-area-inset-top))] shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-[max(1rem,calc((100%-var(--ios-content-width,100%))/2+1rem))] pt-[env(safe-area-inset-top)]",
          "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[calc(100%+20px)] before:bg-linear-to-b before:from-[var(--ios-bar-edge,var(--ios-background))] before:from-35% before:to-transparent before:[mask-image:linear-gradient(to_bottom,black_55%,transparent)] before:opacity-0 before:transition-opacity before:duration-300 data-scrolled:before:opacity-100 data-scrolled:before:backdrop-blur-[3px] motion-reduce:before:transition-none",
          className,
        )}
      >
        <div className="flex min-w-0 items-center justify-start gap-2">{leading}</div>
        <div className="flex min-w-0 flex-col items-center justify-center">
          <Text
            as={showsLargeTitle ? "span" : titleElement}
            aria-hidden={showsLargeTitle || undefined}
            numberOfLines={1}
            className={cn(
              "max-w-[50vw] text-center text-[17px] leading-[22px] font-semibold tracking-[-0.43px] text-(--ios-label) transition-opacity duration-200 motion-reduce:transition-none",
              (showsLargeTitle || titleDisplay === "scroll-edge") &&
                !isScrolledUnder &&
                "opacity-0",
              hidesTitle && "sr-only",
            )}
          >
            {title}
          </Text>
          {subtitle && !showsLargeTitle && !hidesTitle ? (
            <Text
              as="span"
              numberOfLines={1}
              className="text-[12px] leading-4 text-(--ios-secondary-label)"
            >
              {subtitle}
            </Text>
          ) : null}
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2">{trailing}</div>
      </div>
      {showsLargeTitle ? (
        <div className="-mt-1 flex shrink-0 flex-col px-[max(1rem,calc((100%-var(--ios-content-width,100%))/2+1rem))] pb-2.5">
          <Text
            as={titleElement}
            numberOfLines={2}
            className="text-[34px] leading-[41px] font-bold tracking-[0.4px] text-pretty text-(--ios-label)"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text className="text-[15px] leading-5 tracking-[-0.23px] text-(--ios-secondary-label)">
              {subtitle}
            </Text>
          ) : null}
        </div>
      ) : null}
      <div ref={sentinelRef} aria-hidden="true" className="-mb-px h-px shrink-0" />
      {accessory}
    </>
  );
}
