"use client";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import Form from "next/form";
import { useState } from "react";

import type { MtaLabels } from "./types";

import { useMtaNavigation } from "./mta-navigation-provider";

interface MtaLocationControlsProps {
  initialSearchFailed: boolean;
  labels: MtaLabels;
}

export function MtaLocationControls({ initialSearchFailed, labels }: MtaLocationControlsProps) {
  const { actions } = useMtaNavigation();
  const [locationState, setLocationState] = useState<"idle" | "loading" | "error">("idle");

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
    <Surface as="section" className="p-5 sm:p-6" aria-labelledby="location-heading">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-success" />
          <Text as="h2" id="location-heading" size="sm" weight="semibold">
            {labels.locationLabel}
          </Text>
        </div>
        <Form
          action="/mta"
          className="flex flex-col gap-3 sm:flex-row"
          role="search"
          scroll={false}
        >
          <div className="relative flex-1">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-muted-foreground"
            >
              <circle cx="11" cy="11" r="7" strokeWidth="2" />
              <path d="m20 20-4-4" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <Input
              id="mta-location"
              name="q"
              type="search"
              placeholder={labels.locationPlaceholder}
              aria-label={labels.locationLabel}
              maxLength={160}
              className="h-11 rounded-xl bg-background pl-12 shadow-none"
            />
          </div>
          <Button type="submit" className="h-11 rounded-xl px-5">
            {labels.search}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl px-5"
            onClick={detectLocation}
            loading={locationState === "loading"}
            loadingLabel={labels.locating}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="3" strokeWidth="2" />
              <circle cx="12" cy="12" r="8" strokeWidth="2" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {labels.useLocation}
          </Button>
        </Form>
        <Text
          size="xs"
          tone={locationState === "error" || initialSearchFailed ? "destructive" : "muted"}
        >
          {locationState === "error"
            ? labels.locationError
            : initialSearchFailed
              ? labels.searchError
              : labels.searchHint}
        </Text>
      </div>
    </Surface>
  );
}
