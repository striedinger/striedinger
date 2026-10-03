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
  trailing?: ReactNode;
}

const compactBarHeight = 56;

/**
 * An iOS 26 navigation bar rendered inside an element marked with `data-ios-scroll`. The bar
 * has no opaque background: its glass buttons float over content, and a soft blurred scroll
 * edge fades in once content passes underneath. The large title collapses into the centered
 * inline title, observed with an intersection observer so scrolling stays on the compositor.
 * With `scroll-edge`, the inline title appears once the accessory has scrolled away.
 * Set `--ios-bar-edge` on the scroll container to match its background color.
 */
export function IosNavigationBar({
  accessory,
  className,
  leading,
  subtitle,
  title,
  titleDisplay = "large",
  trailing,
}: IosNavigationBarProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isScrolledUnder, setIsScrolledUnder] = useState(false);
  const showsLargeTitle = titleDisplay === "large";
  const hidesTitle = titleDisplay === "hidden";

  useEffect(function observeScrollEdge() {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      function updateScrollEdge([entry]) {
        if (entry) setIsScrolledUnder(!entry.isIntersecting);
      },
      {
        root: sentinel.closest("[data-ios-scroll]"),
        rootMargin: `-${compactBarHeight}px 0px 0px 0px`,
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
        data-scrolled={isScrolledUnder || undefined}
        className={cn(
          "group/bar sticky top-0 z-20 grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-4",
          "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[calc(100%+20px)] before:bg-linear-to-b before:from-[var(--ios-bar-edge,var(--ios-background))] before:from-35% before:to-transparent before:[mask-image:linear-gradient(to_bottom,black_55%,transparent)] before:opacity-0 before:backdrop-blur-[3px] before:transition-opacity before:duration-300 data-scrolled:before:opacity-100 motion-reduce:before:transition-none",
          className,
        )}
      >
        <div className="flex min-w-0 items-center justify-start gap-2">{leading}</div>
        <div className="flex min-w-0 flex-col items-center justify-center">
          <Text
            as={showsLargeTitle ? "span" : "h1"}
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
        <div className="-mt-1 flex shrink-0 flex-col px-4 pb-2.5">
          <Text
            as="h1"
            numberOfLines={1}
            className="text-[34px] leading-[41px] font-bold tracking-[0.4px] text-(--ios-label)"
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
