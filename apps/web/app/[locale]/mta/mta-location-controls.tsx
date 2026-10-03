"use client";

import { LocationArrowIcon } from "@workspace/icons/location-arrow-icon";
import { Text } from "@workspace/ui/components/text";
import Form from "next/form";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { MtaLabels } from "./types";

import { IosBarButton } from "../../../components/ios/ios-bar-button";
import { IosSearchField } from "../../../components/ios/ios-search-field";
import { useMtaNavigation } from "./mta-navigation-provider";

interface MtaLocationControlsProps {
  initialSearchFailed: boolean;
  labels: MtaLabels;
}

/**
 * The floating bottom bar, like Maps: a search field for an address or neighborhood and a
 * button for the current location. It rides above the keyboard while typing.
 */
export function MtaLocationControls({ initialSearchFailed, labels }: MtaLocationControlsProps) {
  const { actions } = useMtaNavigation();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [locationState, setLocationState] = useState<"idle" | "loading" | "error">("idle");
  const message =
    locationState === "error"
      ? labels.locationError
      : initialSearchFailed
        ? labels.searchError
        : null;

  function detectLocation() {
    setLocationState("loading");
    if (!("geolocation" in navigator)) {
      setLocationState("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function useDetectedLocation(position) {
        setLocationState("idle");
        actions.navigateToLocation(
          position.coords.latitude,
          position.coords.longitude,
          labels.currentLocation,
          null,
        );
      },
      function showLocationError() {
        setLocationState("error");
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex translate-y-[calc(-1*var(--keyboard-inset,0px))] flex-col items-center gap-2 px-4 pt-8 pb-[max(calc(env(safe-area-inset-bottom)-var(--keyboard-inset,0px)),14px)] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-linear-to-t before:from-(--ios-grouped-background) before:from-30% before:to-transparent">
      {message ? (
        <Text
          role="alert"
          className="pointer-events-auto max-w-md rounded-[14px] bg-(--ios-menu) px-3.5 py-2 text-center text-[13px] leading-[18px] text-(--ios-red) shadow-[0_8px_24px_rgb(0_0_0/0.12)] backdrop-blur-[20px]"
        >
          {message}
        </Text>
      ) : null}
      <Form
        action={pathname}
        scroll={false}
        className="pointer-events-auto flex w-full max-w-xl items-center gap-2"
      >
        <IosSearchField
          name="q"
          maxLength={160}
          aria-label={labels.locationLabel}
          placeholder={labels.locationPlaceholder}
          cancelLabel={labels.cancel}
          clearLabel={labels.clearText}
          value={query}
          containerClassName="min-w-0 flex-1 [&_label]:h-[52px]"
          onValueChange={setQuery}
        />
        <IosBarButton
          aria-label={locationState === "loading" ? labels.locating : labels.useLocation}
          disabled={locationState === "loading"}
          className="size-[52px] text-(--ios-tint)"
          onClick={detectLocation}
        >
          <LocationArrowIcon
            className={locationState === "loading" ? "animate-pulse" : undefined}
          />
        </IosBarButton>
      </Form>
    </div>
  );
}
