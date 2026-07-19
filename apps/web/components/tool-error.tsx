"use client";

import { Button } from "@workspace/ui/components/button";
import { PageContainer } from "@workspace/ui/components/page-container";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import Link from "next/link";
import { useEffect } from "react";

interface ToolErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function ToolError({ error, reset }: ToolErrorProps) {
  useEffect(
    function reportUnexpectedError() {
      console.error(error);
    },
    [error],
  );

  return (
    <PageShell>
      <PageContainer size="narrow" className="justify-center">
        <Surface
          className="flex min-h-72 flex-col items-start justify-center gap-5 p-6 sm:p-10"
          role="alert"
        >
          <div
            className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-xl text-destructive"
            aria-hidden="true"
          >
            !
          </div>
          <div className="flex flex-col gap-2">
            <Text as="h1" size="2xl" weight="semibold">
              This page hit a snag
            </Text>
            <Text tone="muted" className="max-w-xl leading-relaxed">
              The problem may be temporary. Try loading this part of the app again, or return home.
            </Text>
            {error.digest ? (
              <Text size="xs" tone="muted" className="mt-1 font-mono">
                Reference: {error.digest}
              </Text>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={reset}>
              Try again
            </Button>
            <Button
              render={<Link href="/" aria-label="Return home" />}
              nativeButton={false}
              variant="outline"
            >
              Return home
            </Button>
          </div>
        </Surface>
      </PageContainer>
    </PageShell>
  );
}

export type { ToolErrorProps };
