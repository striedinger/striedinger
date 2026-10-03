"use client";

import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";
import { lazy, Suspense, useRef, useState } from "react";

import type { IosMenuSection, IosMenuVirtualAnchor } from "./ios-menu-types";

import { preloadIosMenu } from "./ios-menu";

const IosMenuPopup = lazy(function importMenuPopup() {
  return import("./ios-menu-popup").then(function selectMenuPopup(module) {
    return { default: module.IosMenuPopup };
  });
});

interface IosContextMenuProps {
  children: ReactNode;
  className?: string;
  sections: readonly IosMenuSection[];
  style?: CSSProperties;
}

interface PressState {
  pointerId: number;
  startX: number;
  startY: number;
  timeout: number;
}

const longPressMilliseconds = 480;
const moveTolerance = 10;

function createPointAnchor(x: number, y: number): IosMenuVirtualAnchor {
  return {
    getBoundingClientRect() {
      return new DOMRect(x, y, 0, 0);
    },
  };
}

/**
 * Opens a menu on long press for touch, right click for mice, and the context menu key for
 * keyboards, the way iOS rows and artwork reveal their actions. The pressed content lifts
 * slightly while the menu is open.
 */
export function IosContextMenu({ children, className, sections, style }: IosContextMenuProps) {
  const pressRef = useRef<PressState | null>(null);
  const suppressClickRef = useRef(false);
  const [anchor, setAnchor] = useState<IosMenuVirtualAnchor | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  function openAt(x: number, y: number) {
    setAnchor(createPointAnchor(x, y));
    setIsOpen(true);
  }

  function cancelPress() {
    const press = pressRef.current;
    if (press) window.clearTimeout(press.timeout);
    pressRef.current = null;
  }

  function startPress(event: PointerEvent<HTMLDivElement>) {
    suppressClickRef.current = false;
    if (event.pointerType === "mouse" || event.button !== 0) return;
    preloadIosMenu();
    const { clientX, clientY, pointerId } = event;
    cancelPress();
    pressRef.current = {
      pointerId,
      startX: clientX,
      startY: clientY,
      timeout: window.setTimeout(function openFromLongPress() {
        pressRef.current = null;
        suppressClickRef.current = true;
        if ("vibrate" in navigator) navigator.vibrate(10);
        openAt(clientX, clientY);
      }, longPressMilliseconds),
    };
  }

  function trackPress(event: PointerEvent<HTMLDivElement>) {
    const press = pressRef.current;
    if (!press || press.pointerId !== event.pointerId) return;
    if (
      Math.abs(event.clientX - press.startX) > moveTolerance ||
      Math.abs(event.clientY - press.startY) > moveTolerance
    ) {
      cancelPress();
    }
  }

  function openFromKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    openAt(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
  }

  return (
    // Long press, right click, and the context menu key are delegated from the interactive
    // content inside; the same actions also stay available from visible buttons.
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      data-open={isOpen || undefined}
      style={style}
      className={cn(
        "transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] select-none [-webkit-touch-callout:none] data-open:scale-[0.97] motion-reduce:transition-none",
        className,
      )}
      onPointerDown={startPress}
      onPointerMove={trackPress}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onKeyDown={openFromKeyboard}
      onContextMenu={function openFromSecondaryClick(event) {
        event.preventDefault();
        if (isOpen || suppressClickRef.current) return;
        openAt(event.clientX, event.clientY);
      }}
      onClickCapture={function suppressClickAfterLongPress(event) {
        if (!suppressClickRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClickRef.current = false;
      }}
    >
      {children}
      {anchor ? (
        <Suspense fallback={null}>
          <IosMenuPopup
            open={isOpen}
            onOpenChange={function updateOpen(nextOpen) {
              setIsOpen(nextOpen);
            }}
            anchor={anchor}
            finalFocus={false}
            sections={sections}
            align="start"
            side="bottom"
          />
        </Suspense>
      ) : null}
    </div>
  );
}
