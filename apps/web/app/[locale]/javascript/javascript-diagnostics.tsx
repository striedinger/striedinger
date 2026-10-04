"use client";

import { RefreshIcon } from "@workspace/icons/refresh-icon";
import { Text } from "@workspace/ui/components/text";
import { useEffect, useState } from "react";

import type { BrowserDiagnosticsLabels, DiagnosticSection } from "./types";

import { IosBarButton } from "../../../components/ios/ios-bar-button";
import { IosListSection } from "../../../components/ios/ios-list-section";
import { collectBrowserDiagnostics } from "./browser-diagnostics";
import { DiagnosticSectionSkeleton } from "./diagnostic-section-skeleton";
import { DiagnosticValueRow, type DiagnosticStatus } from "./diagnostic-value-row";

interface JavaScriptDiagnosticsProps {
  labels: BrowserDiagnosticsLabels;
}

export function JavaScriptDiagnostics({ labels }: JavaScriptDiagnosticsProps) {
  const [sections, setSections] = useState<ReadonlyArray<DiagnosticSection> | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Placeholders reserve roughly the space of each section so details arrive without
  // pushing the rest of the page down.
  const placeholderSections = [
    { title: labels.documentAndJavaScript, rowCount: 14 },
    { title: labels.screenAndWindow, rowCount: 14 },
    { title: labels.dateTimeAndInternationalization, rowCount: 8 },
    { title: labels.navigator, rowCount: 14 },
    { title: labels.clientHints, rowCount: 6 },
    { title: labels.pluginsAndMimeTypes, rowCount: 3 },
    { title: labels.batteryAndNetwork, rowCount: 5 },
    { title: labels.mediaAndDeviceApis, rowCount: 8 },
    { title: labels.storageApis, rowCount: 6 },
    { title: labels.navigatorProperties, rowCount: 16 },
  ];

  useEffect(
    function collectDetails() {
      let cancelled = false;

      void collectBrowserDiagnostics(labels).then(function updateSections(nextSections) {
        if (!cancelled) {
          setSections(nextSections);
          setIsRefreshing(false);
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
    setIsRefreshing(true);
    setRefreshCount(function incrementRefreshCount(count) {
      return count + 1;
    });
  }

  function getStatus(value: string): DiagnosticStatus | undefined {
    if (value === labels.supported || value === labels.enabled) {
      return "positive";
    }

    return value === labels.notSupported ? "negative" : undefined;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <IosBarButton variant="plain" onClick={refreshDetails} disabled={!sections || isRefreshing}>
          <RefreshIcon />
          {labels.refresh}
        </IosBarButton>
      </div>

      <div className="flex flex-col gap-6" aria-live="polite" aria-busy={!sections || isRefreshing}>
        {sections ? (
          sections.map(function renderSection(section, sectionIndex) {
            return (
              <IosListSection
                key={section.title}
                className="px-0 [contain-intrinsic-size:auto_20rem] [content-visibility:auto]"
                header={section.title}
                footer={sectionIndex === 0 ? labels.privacy : undefined}
                label={section.title}
              >
                {section.rows.map(function renderRow(diagnosticRow) {
                  const status = getStatus(diagnosticRow.value);

                  return (
                    <DiagnosticValueRow
                      key={diagnosticRow.label}
                      label={diagnosticRow.label}
                      value={diagnosticRow.value}
                      status={status}
                      monospaceLabel={!diagnosticRow.label.includes(" ")}
                      monospaceValue={!status}
                    />
                  );
                })}
              </IosListSection>
            );
          })
        ) : (
          <>
            <Text className="sr-only">{labels.collecting}</Text>
            {placeholderSections.map(function renderPlaceholder(placeholder) {
              return (
                <DiagnosticSectionSkeleton
                  key={placeholder.title}
                  title={placeholder.title}
                  rowCount={placeholder.rowCount}
                />
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
