"use client";

import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@workspace/ui/lib/utils";

import { IosScreenTransition } from "./ios-screen-transition";
import { useScreenScrollRestoration } from "./use-screen-scroll-restoration";

type IosScreenProps = ComponentPropsWithoutRef<"div">;

/**
 * A full-height scrolling screen of a native app replica, rendered by a route's page. It
 * slides on pushes and pops, keeps its scroll position while hidden behind other screens,
 * and hosts an `IosNavigationBar`.
 */
export function IosScreen({ className, ...props }: IosScreenProps) {
  const scrollerRef = useScreenScrollRestoration();

  return (
    <IosScreenTransition>
      <div
        ref={scrollerRef}
        data-ios-scroll
        className={cn(
          "bg-ios-background absolute inset-0 flex flex-col overflow-y-auto overscroll-contain",
          className,
        )}
        {...props}
      />
    </IosScreenTransition>
  );
}
