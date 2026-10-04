import { Text } from "@workspace/ui/components/text";
import { headers } from "next/headers";

import { IosCopyRowButton } from "../../../components/ios/ios-copy-row-button";
import { IosListSection } from "../../../components/ios/ios-list-section";
import { IosValueRow } from "../../../components/ios/ios-value-row";
import { collectRequestDiagnostics } from "./request-diagnostics";

interface RequestDiagnosticsPanelLabels {
  city: string;
  copied: string;
  copyIpAddress: string;
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
  privacy: string;
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
  const hasIpAddress = diagnostics.ipAddress !== labels.unavailable;

  return (
    <div className="flex flex-col gap-6">
      <IosListSection
        className="px-0"
        header={labels.observedIpAddress}
        footer={labels.privacy}
        label={labels.observedIpAddress}
      >
        <li className="relative px-4 py-4 after:absolute after:right-0 after:bottom-0 after:left-4 after:h-px after:scale-y-50 after:bg-ios-separator">
          <Text
            family={hasIpAddress ? "mono" : undefined}
            className="text-center text-ios-title2 font-semibold break-all text-ios-label"
          >
            <span className="sr-only">{labels.ipAddress} </span>
            {diagnostics.ipAddress}
          </Text>
        </li>
        <IosValueRow label={labels.ipVersion} value={diagnostics.ipVersion} />
        <li>
          <IosCopyRowButton
            value={hasIpAddress ? diagnostics.ipAddress : null}
            label={labels.copyIpAddress}
            copiedLabel={labels.copied}
          />
        </li>
      </IosListSection>

      <IosListSection
        className="px-0"
        header={labels.locationHeading}
        footer={labels.locationDescription}
        label={labels.locationHeading}
      >
        {diagnostics.location.map(function renderLocationRow(row) {
          return <IosValueRow key={row.label} label={row.label} value={row.value} />;
        })}
      </IosListSection>

      <IosListSection className="px-0" header={labels.requestHeading} label={labels.requestHeading}>
        {diagnostics.request.map(function renderRequestRow(row) {
          return (
            <IosValueRow
              key={row.label}
              label={row.label}
              value={row.value}
              monospaceValue={row.label === labels.forwardedAddresses}
            />
          );
        })}
      </IosListSection>

      <IosListSection
        className="px-0"
        header={labels.headersHeading}
        footer={labels.headersDescription}
        label={labels.headersHeading}
      >
        {diagnostics.headers.length > 0 ? (
          diagnostics.headers.map(function renderHeaderRow(row) {
            return (
              <IosValueRow
                key={row.label}
                label={row.label}
                value={row.value}
                monospaceLabel
                monospaceValue
              />
            );
          })
        ) : (
          <li className="px-4 py-[11px]">
            <Text className="text-ios-body text-ios-secondary-label">{labels.unavailable}</Text>
          </li>
        )}
      </IosListSection>
    </div>
  );
}
