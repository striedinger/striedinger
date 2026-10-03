"use client";

import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";

import { cn } from "@workspace/ui/lib/utils";
import { useEffect, useRef, useState } from "react";

import { IosSwipeActionButton, type IosSwipeAction } from "./ios-swipe-action-button";

interface IosSwipeActionsProps {
  children: ReactNode;
  className?: string;
  leadingActions?: readonly IosSwipeAction[];
  trailingActions?: readonly IosSwipeAction[];
}

type OpenSide = "leading" | "trailing" | null;

interface DragState {
  axis: "horizontal" | "vertical" | null;
  pointerId: number;
  startOffset: number;
  startX: number;
  startY: number;
}

const noActions: readonly IosSwipeAction[] = [];
const actionWidth = 74;
const axisLockDistance = 8;
const fullSwipeRatio = 0.62;
const settleTransition = "transform 380ms cubic-bezier(0.32, 0.72, 0, 1)";

/**
 * Reveals row actions with a horizontal swipe, matching UITableView swipe actions. The first
 * action on each side is the outermost one and runs on a full swipe. Offsets are written to the
 * DOM directly during a drag so moving a finger never re-renders the list.
 */
export function IosSwipeActions({
  children,
  className,
  leadingActions = noActions,
  trailingActions = noActions,
}: IosSwipeActionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const leadingPanelRef = useRef<HTMLDivElement>(null);
  const trailingPanelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const offsetRef = useRef(0);
  const suppressClickRef = useRef(false);
  const wheelTimeoutRef = useRef<number | null>(null);
  const [openSide, setOpenSide] = useState<OpenSide>(null);
  const leadingWidth = leadingActions.length * actionWidth;
  const trailingWidth = trailingActions.length * actionWidth;

  function applyOffset(offset: number, animate: boolean) {
    offsetRef.current = offset;
    const content = contentRef.current;
    if (content) {
      content.style.transition = animate ? settleTransition : "none";
      content.style.transform = offset === 0 ? "" : `translate3d(${offset}px, 0, 0)`;
    }
    const leadingPanel = leadingPanelRef.current;
    if (leadingPanel) leadingPanel.style.width = `${Math.max(0, offset)}px`;
    const trailingPanel = trailingPanelRef.current;
    if (trailingPanel) trailingPanel.style.width = `${Math.max(0, -offset)}px`;
    for (const panel of [leadingPanel, trailingPanel]) {
      if (panel)
        panel.style.transition = animate ? "width 380ms cubic-bezier(0.32, 0.72, 0, 1)" : "none";
    }
  }

  function settle(side: OpenSide) {
    applyOffset(side === "leading" ? leadingWidth : side === "trailing" ? -trailingWidth : 0, true);
    setOpenSide(side);
  }

  function clampOffset(offset: number) {
    const maximum = leadingActions.length > 0 ? (containerRef.current?.offsetWidth ?? 0) : 0;
    const minimum = trailingActions.length > 0 ? -(containerRef.current?.offsetWidth ?? 0) : 0;
    return Math.min(maximum, Math.max(minimum, offset));
  }

  function releaseAt(offset: number) {
    const width = containerRef.current?.offsetWidth ?? 0;
    const fullSwipeLeading = leadingActions[0];
    const fullSwipeTrailing = trailingActions[0];
    if (fullSwipeLeading && offset > width * fullSwipeRatio) {
      settle(null);
      fullSwipeLeading.onSelect();
      return;
    }
    if (fullSwipeTrailing && offset < -width * fullSwipeRatio) {
      settle(null);
      fullSwipeTrailing.onSelect();
      return;
    }
    if (offset > leadingWidth / 2 && leadingActions.length > 0) settle("leading");
    else if (offset < -trailingWidth / 2 && trailingActions.length > 0) settle("trailing");
    else settle(null);
  }

  useEffect(
    function closeWhenInteractingElsewhere() {
      if (!openSide) return;
      function closeOnOutsidePointer(event: PointerEvent) {
        if (containerRef.current?.contains(event.target as Node)) return;
        settle(null);
      }
      document.addEventListener("pointerdown", closeOnOutsidePointer, true);
      return function stopListeningForOutsidePointer() {
        document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      };
    },
    // oxlint-disable-next-line react/exhaustive-deps -- Only re-register when the open side changes.
    [openSide],
  );

  useEffect(function cancelPendingWheelSettle() {
    return function clearWheelTimeout() {
      if (wheelTimeoutRef.current !== null) window.clearTimeout(wheelTimeoutRef.current);
    };
  }, []);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    suppressClickRef.current = false;
    dragRef.current = {
      axis: null,
      pointerId: event.pointerId,
      startOffset: offsetRef.current,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (drag.axis === null) {
      if (Math.abs(deltaX) < axisLockDistance && Math.abs(deltaY) < axisLockDistance) return;
      drag.axis = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
      if (drag.axis === "horizontal") event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (drag.axis !== "horizontal") return;
    suppressClickRef.current = true;
    applyOffset(clampOffset(drag.startOffset + deltaX), false);
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (drag.axis === "horizontal") releaseAt(offsetRef.current);
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
      onWheel={function swipeWithTrackpad(event) {
        if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
        applyOffset(clampOffset(offsetRef.current - event.deltaX), false);
        if (wheelTimeoutRef.current !== null) window.clearTimeout(wheelTimeoutRef.current);
        wheelTimeoutRef.current = window.setTimeout(function settleAfterWheel() {
          wheelTimeoutRef.current = null;
          releaseAt(offsetRef.current);
        }, 140);
      }}
    >
      {leadingActions.length > 0 ? (
        <div ref={leadingPanelRef} className="absolute inset-y-0 left-0 flex w-0 overflow-hidden">
          {leadingActions.map(function renderLeadingAction(action) {
            return (
              <IosSwipeActionButton
                key={action.id}
                action={action}
                hidden={openSide !== "leading"}
                onSelect={function selectLeadingAction() {
                  settle(null);
                  action.onSelect();
                }}
              />
            );
          })}
        </div>
      ) : null}
      {trailingActions.length > 0 ? (
        <div
          ref={trailingPanelRef}
          className="absolute inset-y-0 right-0 flex w-0 flex-row-reverse overflow-hidden"
        >
          {trailingActions.map(function renderTrailingAction(action) {
            return (
              <IosSwipeActionButton
                key={action.id}
                action={action}
                hidden={openSide !== "trailing"}
                onSelect={function selectTrailingAction() {
                  settle(null);
                  action.onSelect();
                }}
              />
            );
          })}
        </div>
      ) : null}
      <div
        ref={contentRef}
        className="relative touch-pan-y bg-inherit will-change-transform"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClickCapture={function suppressClickAfterSwipe(event) {
          if (suppressClickRef.current || offsetRef.current !== 0) {
            event.preventDefault();
            event.stopPropagation();
            suppressClickRef.current = false;
            if (offsetRef.current !== 0) settle(null);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
