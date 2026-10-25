"use client";

import type { ReactNode } from "react";

import { Drawer } from "@base-ui/react/drawer";
import { CloseIcon } from "@workspace/icons/close-icon";
import { cn } from "@workspace/ui/lib/utils";

import { useOpenAfterMount } from "../use-open-after-mount";
import { IosBarButton } from "./ios-bar-button";
import { useIosPortalContainer } from "./ios-portal-container";

interface IosSheetProps {
  children: ReactNode;
  closeLabel: string;
  /** Replaces the scrolling content area's padding. */
  contentClassName?: string;
  description?: ReactNode;
  /** `large` fills nearly the whole screen, for sheets that present a full view of content. */
  detent?: "medium" | "large";
  /** Lifts the sheet above the software keyboard, for sheets with text fields. */
  followsKeyboard?: boolean;
  onOpenChange: (open: boolean) => void;
  /** Runs once the sheet has finished sliding in or out. */
  onOpenChangeComplete?: (open: boolean) => void;
  open: boolean;
  /** Shown under a leading title, such as a stock's company name under its ticker. */
  subtitle?: ReactNode;
  title: ReactNode;
  /** `leading` puts a large title on the left with the actions and close button on the right. */
  titleAlignment?: "center" | "leading";
  /** Buttons beside the close button. */
  trailing?: ReactNode;
}

/**
 * The iOS bottom sheet: a grabber, a close button beside a centered title, and scrolling
 * content, which swipes down to dismiss. It opens one frame after mounting so it slides in.
 */
export function IosSheet({
  children,
  closeLabel,
  contentClassName = "px-4 pt-2 pb-6",
  description,
  detent = "medium",
  followsKeyboard = false,
  onOpenChange,
  onOpenChangeComplete,
  open,
  subtitle,
  title,
  titleAlignment = "center",
  trailing,
}: IosSheetProps) {
  const portalContainer = useIosPortalContainer();
  const isOpen = useOpenAfterMount(open);

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={function changeOpen(nextOpen) {
        onOpenChange(nextOpen);
      }}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <Drawer.Portal container={portalContainer}>
        <Drawer.Backdrop className="fixed inset-0 z-50 bg-black opacity-[calc(0.25*(1-var(--drawer-swipe-progress)))] transition-opacity duration-450 ease-ios data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0 motion-reduce:transition-none" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center">
          <Drawer.Popup
            className={cn(
              "flex w-full max-w-xl [transform:translateY(var(--drawer-swipe-movement-y))] flex-col overflow-hidden rounded-t-ios-sheet bg-ios-grouped-background text-ios-label shadow-ios-sheet transition-transform duration-450 ease-ios outline-none data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)] data-swiping:select-none motion-reduce:transition-none",
              followsKeyboard
                ? "mb-(--keyboard-inset,0px) max-h-[calc(85dvh-var(--keyboard-inset,0px))] pb-safe-keyboard-min-0"
                : "max-h-[85dvh] pb-safe-plus-0",
              detent === "large" &&
                "h-[calc(100dvh-max(env(safe-area-inset-top),1rem)-0.5rem)] max-h-none",
            )}
          >
            <div
              aria-hidden="true"
              className="mx-auto mt-1.5 h-1.25 w-9 shrink-0 rounded-full bg-ios-tertiary-label"
            />
            {titleAlignment === "leading" ? (
              <div className="flex shrink-0 items-start gap-2 pt-1 pr-4 pb-2 pl-5">
                <div className="flex min-w-0 flex-1 flex-col pt-1">
                  <Drawer.Title className="truncate text-ios-title2 font-bold">
                    {title}
                  </Drawer.Title>
                  {subtitle ? (
                    <span className="truncate text-ios-subheadline text-ios-secondary-label">
                      {subtitle}
                    </span>
                  ) : null}
                </div>
                {trailing}
                <Drawer.Close render={<IosBarButton aria-label={closeLabel} />}>
                  <CloseIcon strokeWidth={2.4} />
                </Drawer.Close>
              </div>
            ) : (
              <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center px-4 pt-1 pb-1">
                <Drawer.Close
                  render={<IosBarButton aria-label={closeLabel} className="justify-self-start" />}
                >
                  <CloseIcon strokeWidth={2.4} />
                </Drawer.Close>
                <Drawer.Title className="text-ios-body font-semibold">{title}</Drawer.Title>
                <span className="flex justify-self-end">{trailing}</span>
              </div>
            )}
            {description ? (
              <Drawer.Description className="shrink-0 px-8 pb-1 text-center text-ios-footnote text-ios-secondary-label">
                {description}
              </Drawer.Description>
            ) : null}
            <Drawer.Content className={cn("overflow-y-auto overscroll-contain", contentClassName)}>
              {children}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
