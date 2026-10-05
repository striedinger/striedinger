"use client";

import type { ComponentPropsWithRef } from "react";

import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useState } from "react";

import type { IosAppSwitcherLabels } from "./ios-app-switcher-context";

import { IosAppSwitcher } from "./ios-app-switcher";
import { IosPortalContainerContext } from "./ios-portal-container";
import { useKeyboardInset } from "./use-keyboard-inset";
import "./ios-utilities.css";
import "./ios-view-transitions.css";

// Apple's iOS system colors for the light and dark appearances. Native replicas use these
// instead of the site palette so materials, labels, and separators match the real apps.
const systemColorClasses = [
  "[--ios-background:#ffffff] dark:[--ios-background:#000000]",
  "[--ios-secondary-background:#f2f2f7] dark:[--ios-secondary-background:#1c1c1e]",
  "[--ios-tertiary-background:#ffffff] dark:[--ios-tertiary-background:#2c2c2e]",
  "[--ios-grouped-background:#f2f2f7] dark:[--ios-grouped-background:#000000]",
  "[--ios-grouped-cell:#ffffff] dark:[--ios-grouped-cell:#1c1c1e]",
  "[--ios-grouped-cell-pressed:#d1d1d6] dark:[--ios-grouped-cell-pressed:#3a3a3c]",
  "[--ios-label:#000000] dark:[--ios-label:#ffffff]",
  "[--ios-secondary-label:rgb(60_60_67/0.6)] dark:[--ios-secondary-label:rgb(235_235_245/0.6)]",
  "[--ios-tertiary-label:rgb(60_60_67/0.3)] dark:[--ios-tertiary-label:rgb(235_235_245/0.3)]",
  "[--ios-separator:rgb(60_60_67/0.29)] dark:[--ios-separator:rgb(84_84_88/0.65)]",
  "[--ios-fill:rgb(120_120_128/0.2)] dark:[--ios-fill:rgb(120_120_128/0.36)]",
  "[--ios-secondary-fill:rgb(120_120_128/0.16)] dark:[--ios-secondary-fill:rgb(120_120_128/0.32)]",
  "[--ios-tertiary-fill:rgb(118_118_128/0.12)] dark:[--ios-tertiary-fill:rgb(118_118_128/0.24)]",
  "[--ios-chrome:rgb(249_249_249/0.82)] dark:[--ios-chrome:rgb(22_22_22/0.82)]",
  "[--ios-menu:rgb(242_242_242/0.82)] dark:[--ios-menu:rgb(37_37_37/0.84)]",
  "[--ios-glass:rgb(250_250_252/0.74)] dark:[--ios-glass:rgb(38_38_42/0.68)]",
  "[--ios-glass-strong:rgb(255_255_255/0.78)] dark:[--ios-glass-strong:rgb(44_44_48/0.78)]",
  "[--ios-glass-lens:rgb(120_120_128/0.16)] dark:[--ios-glass-lens:rgb(255_255_255/0.14)]",
  "[--ios-glass-edge:rgb(255_255_255/0.75)] dark:[--ios-glass-edge:rgb(255_255_255/0.16)]",
  "[--ios-glass-shadow:rgb(0_0_0/0.12)] dark:[--ios-glass-shadow:rgb(0_0_0/0.4)]",
  "[--ios-gray:#8e8e93]",
  "[--ios-red:#ff3b30] dark:[--ios-red:#ff453a]",
  "[--ios-orange:#ff9500] dark:[--ios-orange:#ff9f0a]",
  "[--ios-yellow:#ffcc00] dark:[--ios-yellow:#ffd60a]",
  "[--ios-purple:#af52de] dark:[--ios-purple:#bf5af2]",
  "[--ios-blue:#007aff] dark:[--ios-blue:#0a84ff]",
  "[--ios-green:#34c759] dark:[--ios-green:#30d158]",
].join(" ");

type IosAppFrameProps = Omit<ComponentPropsWithRef<"main">, "ref"> & {
  /** Links this app to the others through the app switcher sheet. */
  appSwitcher?: { currentHref: string; labels: IosAppSwitcherLabels };
};

export function IosAppFrame({ appSwitcher, children, className, ...props }: IosAppFrameProps) {
  const [frameElement, setFrameElement] = useState<HTMLElement | null>(null);
  useKeyboardInset(frameElement);

  // Native apps do not rubber-band the whole window or zoom on double tap; only their own
  // scroll views bounce.
  useEffect(function lockDocumentScrolling() {
    const rootStyle = document.documentElement.style;
    const bodyStyle = document.body.style;
    const previousRootOverscroll = rootStyle.overscrollBehavior;
    const previousBodyOverscroll = bodyStyle.overscrollBehavior;
    const previousBodyOverflow = bodyStyle.overflow;
    rootStyle.overscrollBehavior = "none";
    bodyStyle.overscrollBehavior = "none";
    bodyStyle.overflow = "hidden";
    return function restoreDocumentScrolling() {
      rootStyle.overscrollBehavior = previousRootOverscroll;
      bodyStyle.overscrollBehavior = previousBodyOverscroll;
      bodyStyle.overflow = previousBodyOverflow;
    };
  }, []);

  return (
    <main
      ref={setFrameElement}
      data-slot="ios-app-frame"
      className={cn(
        "font-features-['cv11','ss03'] relative flex h-dvh w-full touch-manipulation overflow-hidden bg-ios-background font-[-apple-system,BlinkMacSystemFont,'SF_Pro_Text','SF_Pro',var(--font-ios-fallback),system-ui,sans-serif] text-ios-label antialiased [-webkit-tap-highlight-color:transparent] [text-rendering:optimizeLegibility]",
        systemColorClasses,
        className,
      )}
      {...props}
    >
      <IosPortalContainerContext value={frameElement}>
        {appSwitcher ? (
          <IosAppSwitcher currentHref={appSwitcher.currentHref} labels={appSwitcher.labels}>
            {children}
          </IosAppSwitcher>
        ) : (
          children
        )}
      </IosPortalContainerContext>
    </main>
  );
}
