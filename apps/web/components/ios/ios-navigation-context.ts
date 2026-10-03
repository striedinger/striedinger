"use client";

import { createContext, use } from "react";

import type { IosNavigationDirection } from "./ios-navigation-transition";

export interface IosNavigateOptions {
  /** The slide that plays, or `none` for changes that replace content in place. */
  direction?: IosNavigationDirection | "none";
}

export interface IosRouter {
  /**
   * Pops to the previous screen. When the app pushed the current screen, this walks browser
   * history back so the forward button keeps working; otherwise, as after opening a shared
   * link, it replaces the screen with `fallbackHref`.
   */
  back: (fallbackHref: string) => void;
  push: (href: string, options?: IosNavigateOptions) => void;
  replace: (href: string, options?: IosNavigateOptions) => void;
}

export const IosNavigationContext = createContext<IosRouter | null>(null);

/** Screen navigation for the native app replicas, provided by `IosNavigationProvider`. */
export function useIosRouter() {
  const router = use(IosNavigationContext);
  if (!router) throw new Error("useIosRouter must be used inside IosNavigationProvider.");
  return router;
}
