"use client";

import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";
import { useEffect } from "react";

import type { ToolErrorProps } from "../tool-error";

import { iosFilledButtonClassName } from "./ios-button-styles";

/** The error boundary screen for native apps, styled like an iOS content-unavailable view. */
export function IosToolError({ error, reset }: ToolErrorProps) {
  useEffect(
    function reportUnexpectedError() {
      console.error(error);
    },
    [error],
  );

  return (
    <div
      role="alert"
      className="flex size-full flex-col items-center justify-center gap-6 bg-ios-grouped-background px-8 pt-safe-plus-0 pb-safe-min-6 text-center"
    >
      <span
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-full bg-ios-red/12 text-ios-large-title leading-none font-bold text-ios-red"
      >
        !
      </span>
      <div className="flex max-w-sm flex-col gap-1.5">
        <Text as="h1" className="text-ios-title2 font-bold text-ios-label">
          This page hit a snag
        </Text>
        <Text className="text-ios-subheadline text-ios-secondary-label">
          The problem may be temporary. Try loading this part of the app again, or return home.
        </Text>
        {error.digest ? (
          <Text className="pt-1 font-mono text-ios-caption1 text-ios-tertiary-label">
            Reference: {error.digest}
          </Text>
        ) : null}
      </div>
      <div className="flex w-full max-w-xs flex-col items-center gap-2">
        <button type="button" className={cn(iosFilledButtonClassName, "w-full")} onClick={reset}>
          Try again
        </button>
        <Link
          href="/"
          className="flex h-11 items-center px-4 text-ios-body text-ios-tint outline-none active:opacity-50"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
