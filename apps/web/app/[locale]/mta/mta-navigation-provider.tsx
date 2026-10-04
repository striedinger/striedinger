"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, use, useOptimistic, useTransition, type ReactNode } from "react";

interface NavigationState {
  isNavigating: boolean;
  /** The train filter being loaded, or `undefined` when no filter change is pending. */
  pendingRoute: string | null | undefined;
}

interface NavigationActions {
  navigateToLocation: (
    latitude: number,
    longitude: number,
    locationName: string,
    route: string | null,
  ) => void;
  refresh: () => void;
}

interface MtaNavigationContextValue {
  state: NavigationState;
  actions: NavigationActions;
}

const MtaNavigationContext = createContext<MtaNavigationContextValue | null>(null);

export function MtaNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  // Staying on the current path keeps a localized page (such as /es/mta) in its language.
  const pathname = usePathname();
  const [isNavigating, startNavigation] = useTransition();
  const [pendingRoute, setPendingRoute] = useOptimistic<string | null | undefined>(undefined);
  const value: MtaNavigationContextValue = {
    actions: {
      navigateToLocation(
        latitude: number,
        longitude: number,
        locationName: string,
        route: string | null,
      ) {
        const parameters = new URLSearchParams({
          latitude: latitude.toFixed(6),
          location: locationName,
          longitude: longitude.toFixed(6),
        });
        if (route) parameters.set("train", route);
        startNavigation(function loadServerArrivals() {
          setPendingRoute(route);
          router.push(`${pathname}?${parameters}`, { scroll: false });
        });
      },
      refresh() {
        startNavigation(function refreshServerData() {
          router.refresh();
        });
      },
    },
    state: { isNavigating, pendingRoute },
  };

  return <MtaNavigationContext value={value}>{children}</MtaNavigationContext>;
}

export function useMtaNavigation(): MtaNavigationContextValue {
  const context = use(MtaNavigationContext);
  if (!context) throw new Error("useMtaNavigation must be used within MtaNavigationProvider");
  return context;
}
