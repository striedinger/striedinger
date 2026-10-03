"use client";

import type { MouseEvent, ReactElement } from "react";

import { cloneElement, lazy, Suspense, useRef, useState } from "react";

import type { IosMenuSection } from "./ios-menu-types";

export type { IosMenuAction, IosMenuSection } from "./ios-menu-types";

const loadMenuPopup = () => import("./ios-menu-popup");
const IosMenuPopup = lazy(function importMenuPopup() {
  return loadMenuPopup().then(function selectMenuPopup(module) {
    return { default: module.IosMenuPopup };
  });
});

/** Starts downloading the menu surface before it is needed, such as on hover or touch. */
export function preloadIosMenu() {
  void loadMenuPopup();
}

export type IosMenuTrigger = IosMenuProps["trigger"];

interface IosMenuProps {
  align?: "start" | "center" | "end";
  sections: readonly IosMenuSection[];
  side?: "top" | "bottom";
  trigger: ReactElement<{
    onClick?: (event: MouseEvent<HTMLElement>) => void;
    onFocus?: () => void;
    onPointerEnter?: () => void;
    onTouchStart?: () => void;
  }>;
}

const reopenGuardMilliseconds = 250;

/** A pull-down menu attached to a bar button or other trigger. */
export function IosMenu({ align = "end", sections, side = "bottom", trigger }: IosMenuProps) {
  const triggerRef = useRef<HTMLElement>(null);
  const closedAtRef = useRef(0);
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);

  function updateOpen(nextOpen: boolean, timeStamp: number) {
    if (!nextOpen) closedAtRef.current = timeStamp;
    setIsOpen(nextOpen);
  }

  return (
    <>
      {cloneElement(trigger, {
        ref: triggerRef,
        "aria-haspopup": "menu",
        "aria-expanded": isOpen,
        onPointerEnter: preloadIosMenu,
        onTouchStart: preloadIosMenu,
        onFocus: preloadIosMenu,
        onClick: function toggleMenu(event: MouseEvent<HTMLElement>) {
          trigger.props.onClick?.(event);
          // A press on the trigger first closes an open menu as an outside press; ignore the click.
          if (event.timeStamp - closedAtRef.current < reopenGuardMilliseconds) return;
          setHasOpened(true);
          updateOpen(!isOpen, event.timeStamp);
        },
      } as Record<string, unknown>)}
      {hasOpened ? (
        <Suspense fallback={null}>
          <IosMenuPopup
            open={isOpen}
            onOpenChange={updateOpen}
            anchor={triggerRef}
            finalFocus={triggerRef}
            sections={sections}
            align={align}
            side={side}
          />
        </Suspense>
      ) : null}
    </>
  );
}
