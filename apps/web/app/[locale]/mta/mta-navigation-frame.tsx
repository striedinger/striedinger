"use client";

import type { ReactNode } from "react";

import { useMtaNavigation } from "./mta-navigation-provider";

export function MtaNavigationFrame({ children }: { children: ReactNode }) {
  const { state } = useMtaNavigation();

  return (
    <div className="flex flex-col gap-10" aria-busy={state.isNavigating}>
      {children}
    </div>
  );
}
