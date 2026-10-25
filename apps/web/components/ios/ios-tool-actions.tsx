"use client";

import type { ReactNode } from "react";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { iosToolActionsSlot } from "./ios-tool-actions-slot";

function subscribeToNothing() {
  return function unsubscribeFromNothing() {};
}

function findSlot() {
  return document.querySelector(`[${iosToolActionsSlot}]`);
}

function findNoSlot() {
  return null;
}

/**
 * Puts a page's buttons in the navigation bar's trailing corner, where iOS keeps a screen's
 * actions, although the bar itself is rendered by the server layout above the page.
 */
export function IosToolActions({ children }: { children: ReactNode }) {
  const slot = useSyncExternalStore(subscribeToNothing, findSlot, findNoSlot);
  return slot ? createPortal(children, slot) : null;
}
