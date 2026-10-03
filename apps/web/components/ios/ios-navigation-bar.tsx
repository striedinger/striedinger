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
  title: string;
  titleDisplay?: IosNavigationBarTitleDisplay;
  trailing?: ReactNode;
}

const compactBarHeight = 44;

/**
 * A UIKit-style navigation bar rendered inside an element marked with `data-ios-scroll`.
 * The large title collapses into the compact bar once it scrolls underneath it, using an
 * intersection observer instead of scroll listeners so scrolling stays on the compositor.
 * With `scroll-edge`, the inline title and bar material appear once the accessory (such as an
 * artwork header) has scrolled away.
 */
export function IosNavigationBar({
  accessory,
  className,
  leading,
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
          "group/bar sticky top-0 z-20 grid h-11 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-2 transition-[background-color,box-shadow] duration-200 data-scrolled:bg-(--ios-chrome) data-scrolled:shadow-[0_0.5px_0_var(--ios-separator)] data-scrolled:backdrop-blur-xl data-scrolled:backdrop-saturate-180 motion-reduce:transition-none",
          className,
        )}
      >
        <div className="flex min-w-0 items-center justify-start">{leading}</div>
        <div className="flex min-w-0 justify-center">
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
        </div>
        <div className="flex min-w-0 items-center justify-end">{trailing}</div>
      </div>
      {showsLargeTitle ? (
        <Text
          as="h1"
          numberOfLines={1}
          className="shrink-0 px-4 pt-0.5 pb-2 text-[34px] leading-[41px] font-bold tracking-[0.37px] text-(--ios-label)"
        >
          {title}
        </Text>
      ) : null}
      <div ref={sentinelRef} aria-hidden="true" className="-mb-px h-px shrink-0" />
      {accessory}
    </>
  );
}
