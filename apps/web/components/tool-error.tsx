"use client";

import { useEffect } from "react";

interface ToolErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * The error screen for site pages. Next.js loads error boundaries with every page, so this
 * uses plain elements rather than the UI kit's components, which would add their class
 * merging code to the home page's JavaScript.
 */
export function ToolError({ error, reset }: ToolErrorProps) {
  useEffect(
    function reportUnexpectedError() {
      console.error(error);
    },
    [error],
  );

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-16 font-sans">
      <section
        role="alert"
        className="flex w-full max-w-2xl flex-col items-start gap-5 rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-10"
      >
        <div
          aria-hidden="true"
          className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-xl text-destructive"
        >
          !
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-foreground">This page hit a snag</h1>
          <p className="max-w-xl leading-relaxed text-muted-foreground">
            The problem may be temporary. Try loading this part of the app again, or return home.
          </p>
          {error.digest ? (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity duration-150 outline-none hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring/35 motion-reduce:transition-none"
            onClick={reset}
          >
            Try again
          </button>
          {/* A full page load resets whatever state broke the page. */}
          {/* oxlint-disable-next-line nextjs/no-html-link-for-pages */}
          <a
            href="/"
            className="inline-flex h-9 items-center rounded-md border border-input bg-card px-4 text-sm font-medium text-foreground transition-colors duration-150 outline-none hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/35 motion-reduce:transition-none"
          >
            Return home
          </a>
        </div>
      </section>
    </main>
  );
}

export type { ToolErrorProps };
