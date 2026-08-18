import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import { headers } from "next/headers";

import { collectRequestDiagnostics } from "./request-diagnostics";

interface RequestDiagnosticsPanelLabels {
  city: string;
  country: string;
  forwardedAddresses: string;
  headersDescription: string;
  headersHeading: string;
  host: string;
  ipAddress: string;
  ipVersion: string;
  latitude: string;
  locationDescription: string;
  locationHeading: string;
  longitude: string;
  observedIpAddress: string;
  protocol: string;
  region: string;
  requestHeading: string;
  timeZone: string;
  unavailable: string;
}

interface RequestDiagnosticsPanelProps {
  labels: RequestDiagnosticsPanelLabels;
}

export async function RequestDiagnosticsPanel({ labels }: RequestDiagnosticsPanelProps) {
  const requestHeaders = await headers();
  const diagnostics = collectRequestDiagnostics(requestHeaders, {
    city: labels.city,
    country: labels.country,
    forwardedAddresses: labels.forwardedAddresses,
    host: labels.host,
    ipVersionFour: "IPv4",
    ipVersionSix: "IPv6",
    latitude: labels.latitude,
    longitude: labels.longitude,
    protocol: labels.protocol,
    region: labels.region,
    timeZone: labels.timeZone,
    unavailable: labels.unavailable,
  });
  const sections = [
    {
      title: labels.locationHeading,
      description: labels.locationDescription,
      rows: diagnostics.location,
    },
    {
      title: labels.requestHeading,
      description: null,
      rows: diagnostics.request,
    },
    {
      title: labels.headersHeading,
      description: labels.headersDescription,
      rows: diagnostics.headers,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4" aria-labelledby="observed-ip-heading">
        <Text as="h2" id="observed-ip-heading" size="xl" weight="semibold">
          {labels.observedIpAddress}
        </Text>
        <Surface className="overflow-hidden p-6 shadow-none">
          <Text family="mono" size="2xl" weight="semibold" className="break-all">
            {diagnostics.ipAddress}
          </Text>
          <dl className="mt-5 grid gap-3 border-t border-border/70 pt-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Text as="dt" family="mono" size="xs" tone="muted">
                {labels.ipAddress}
              </Text>
              <Text as="dd" family="mono" size="sm" className="break-all">
                {diagnostics.ipAddress}
              </Text>
            </div>
            <div className="flex flex-col gap-1">
              <Text as="dt" family="mono" size="xs" tone="muted">
                {labels.ipVersion}
              </Text>
              <Text as="dd" family="mono" size="sm">
                {diagnostics.ipVersion}
              </Text>
            </div>
          </dl>
        </Surface>
      </section>

      {sections.map(function renderSection(section) {
        return (
          <section key={section.title} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Text as="h2" size="xl" weight="semibold">
                {section.title}
              </Text>
              {section.description ? (
                <Text size="sm" tone="muted">
                  {section.description}
                </Text>
              ) : null}
            </div>
            <Surface className="overflow-hidden shadow-none">
              {section.rows.length > 0 ? (
                <dl className="divide-y divide-border/70">
                  {section.rows.map(function renderRow(row) {
                    return (
                      <div
                        key={row.label}
                        className="grid gap-1 px-4 py-3 sm:grid-cols-[15rem_minmax(0,1fr)]"
                      >
                        <Text as="dt" family="mono" size="xs" tone="muted">
                          {row.label}
                        </Text>
                        <Text
                          as="dd"
                          family="mono"
                          size="xs"
                          className="min-w-0 break-words whitespace-pre-wrap"
                        >
                          {row.value}
                        </Text>
                      </div>
                    );
                  })}
                </dl>
              ) : (
                <Text className="p-5" tone="muted">
                  {labels.unavailable}
                </Text>
              )}
            </Surface>
          </section>
        );
      })}
    </div>
  );
}
