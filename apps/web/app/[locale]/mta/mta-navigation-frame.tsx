"use client";

import type { ReactNode } from "react";

import { useMtaNavigation } from "./mta-navigation-provider";

export function MtaNavigationFrame({ children }: { children: ReactNode }) {
  const { state } = useMtaNavigation();

  return (
    <div
      aria-busy={state.isNavigating}
      className="flex flex-col pt-1 transition-opacity duration-200 aria-busy:opacity-60 motion-reduce:transition-none"
    >
      {children}
    </div>
  );
}
