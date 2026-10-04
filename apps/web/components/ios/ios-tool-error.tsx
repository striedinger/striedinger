"use client";

import { Text } from "@workspace/ui/components/text";
import Link from "next/link";
import { useEffect } from "react";

import type { ToolErrorProps } from "../tool-error";

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
      className="flex size-full flex-col items-center justify-center gap-6 bg-(--ios-grouped-background) px-8 pt-[env(safe-area-inset-top)] pb-[max(env(safe-area-inset-bottom),24px)] text-center"
    >
      <span
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-full bg-(--ios-red)/12 text-[34px] leading-none font-bold text-(--ios-red)"
      >
        !
      </span>
      <div className="flex max-w-sm flex-col gap-1.5">
        <Text
          as="h1"
          className="text-[22px] leading-7 font-bold tracking-[0.35px] text-(--ios-label)"
        >
          This page hit a snag
        </Text>
        <Text className="text-[15px] leading-5 tracking-[-0.23px] text-(--ios-secondary-label)">
          The problem may be temporary. Try loading this part of the app again, or return home.
        </Text>
        {error.digest ? (
          <Text className="pt-1 font-mono text-[12px] leading-4 text-(--ios-tertiary-label)">
            Reference: {error.digest}
          </Text>
        ) : null}
      </div>
      <div className="flex w-full max-w-xs flex-col items-center gap-2">
        <button
          type="button"
          className="h-[50px] w-full rounded-full bg-(--ios-tint) text-[17px] font-semibold tracking-[-0.43px] text-white transition-transform duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-(--ios-tint)/50 active:scale-[0.97] motion-reduce:transition-none"
          onClick={reset}
        >
          Try again
        </button>
        <Link
          href="/"
          className="flex h-11 items-center px-4 text-[17px] tracking-[-0.43px] text-(--ios-tint) outline-none active:opacity-50"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
