"use client";

import { Button } from "@workspace/ui/components/button";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import { useEffect, useState } from "react";

import type { BrowserDiagnosticsLabels, DiagnosticSection } from "./types";

import { collectBrowserDiagnostics } from "./browser-diagnostics";

interface JavaScriptDiagnosticsProps {
  labels: BrowserDiagnosticsLabels;
}

export function JavaScriptDiagnostics({ labels }: JavaScriptDiagnosticsProps) {
  const [sections, setSections] = useState<ReadonlyArray<DiagnosticSection> | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(
    function collectDetails() {
      let cancelled = false;

      void collectBrowserDiagnostics(labels).then(function updateSections(nextSections) {
        if (!cancelled) {
          setSections(nextSections);
        }

        return undefined;
      });

      return function cancelCollection() {
        cancelled = true;
      };
    },
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- Refresh clicks intentionally repeat collection.
    [labels, refreshCount],
  );

  function refreshDetails() {
    setSections(null);
    setRefreshCount(function incrementRefreshCount(count) {
      return count + 1;
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={refreshDetails} disabled={!sections}>
          {labels.refresh}
        </Button>
      </div>

      <div className="flex flex-col gap-8" aria-live="polite" aria-busy={!sections}>
        {sections ? (
          sections.map(function renderSection(section) {
            return (
              <section
                key={section.title}
                className="flex flex-col gap-4 [contain-intrinsic-size:auto_20rem] [content-visibility:auto]"
              >
                <Text as="h2" size="xl" weight="semibold">
                  {section.title}
                </Text>
                <Surface className="overflow-hidden shadow-none">
                  <dl className="divide-y divide-border/70">
                    {section.rows.map(function renderRow(diagnosticRow) {
                      return (
                        <div
                          key={diagnosticRow.label}
                          className="grid gap-1 px-4 py-3 sm:grid-cols-[15rem_minmax(0,1fr)]"
                        >
                          <Text as="dt" family="mono" size="xs" tone="muted">
                            {diagnosticRow.label}
                          </Text>
                          <Text
                            as="dd"
                            family="mono"
                            size="xs"
                            className="min-w-0 break-words whitespace-pre-wrap"
                          >
                            {diagnosticRow.value}
                          </Text>
                        </div>
                      );
                    })}
                  </dl>
                </Surface>
              </section>
            );
          })
        ) : (
          <Surface className="p-6 shadow-none">
            <Text tone="muted">{labels.collecting}</Text>
          </Surface>
        )}
      </div>
    </div>
  );
}
