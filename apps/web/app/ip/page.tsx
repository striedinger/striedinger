import type { Metadata } from "next";

import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import { Suspense } from "react";

import type { WebRtcLabels } from "./types";

import { JsonLd } from "../../components/json-ld";
import { ToolDetails } from "../../components/tool-details";
import { createPageMetadata, createWebApplicationStructuredData } from "../../lib/seo";
import { getIpTranslator } from "../../messages/ip/get-translator";
import { getRequestLocale } from "../get-request-locale";
import { RequestDiagnosticsPanel } from "./request-diagnostics-panel";
import { WebRtcLeakTest } from "./webrtc-leak-test";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getIpTranslator(locale);
  const title = translate("IP Address Information");
  const description = translate(
    "See the public IP address, approximate request location, and HTTP information visible to this website.",
  );

  return createPageMetadata({ title, description, locale, path: "/ip" });
}

export default async function IpAddressInformationPage() {
  const locale = await getRequestLocale();
  const translate = await getIpTranslator(locale);
  const title = translate("IP Address Information");
  const description = translate(
    "See the public IP address, approximate request location, and HTTP information visible to this website.",
  );
  const requestBehavior = translate(
    "The server reports the address and request metadata it receives from your connection.",
  );
  const privacy = translate(
    "This page does not use a third-party IP lookup service. Approximate location is shown only when the hosting platform provides it.",
  );
  const locationDescription = translate(
    "Location values are approximate and may identify a network exit point instead of your physical location.",
  );
  const headersDescription = translate(
    "Only privacy-safe request headers are displayed. Cookies, authorization values, and internal identifiers are excluded.",
  );
  const requestLabels = {
    city: translate("City"),
    country: translate("Country"),
    forwardedAddresses: translate("Forwarded addresses"),
    headersDescription,
    headersHeading: translate("HTTP Request Headers"),
    host: translate("Host"),
    ipAddress: translate("IP address"),
    ipVersion: translate("IP version"),
    latitude: translate("Latitude"),
    locationDescription,
    locationHeading: translate("Request Location"),
    longitude: translate("Longitude"),
    observedIpAddress: translate("Observed IP Address"),
    protocol: translate("Protocol"),
    region: translate("Region"),
    requestHeading: translate("Request Details"),
    timeZone: translate("Time zone"),
    unavailable: translate("Unavailable"),
  };
  const webRtcLabels: WebRtcLabels = {
    address: translate("Address"),
    candidateType: translate("Candidate type"),
    description: translate(
      "This optional test contacts Cloudflare's public STUN server and lists the ICE addresses exposed by your browser.",
    ),
    failed: translate("The WebRTC test could not complete."),
    heading: translate("WebRTC Leak Test"),
    noCandidates: translate("No ICE candidates were exposed."),
    notSupported: translate("WebRTC is not supported by this browser."),
    protocol: translate("Protocol"),
    runTest: translate("Run WebRTC test"),
    testing: translate("Testing…"),
  };
  const structuredData = createWebApplicationStructuredData({
    name: title,
    description,
    applicationCategory: "DeveloperApplication",
    browserRequirements: "Modern web browser",
    featureList: [
      requestLabels.observedIpAddress,
      requestLabels.locationHeading,
      requestLabels.headersHeading,
      webRtcLabels.heading,
    ],
    locale,
    path: "/ip",
  });

  return (
    <PageShell>
      <JsonLd value={structuredData} />
      <PageContainer>
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
          <PageHeader title={title} description={description} />

          <Suspense
            fallback={
              <Surface className="p-6 shadow-none">
                <Text tone="muted">{translate("Loading request details…")}</Text>
              </Surface>
            }
          >
            <RequestDiagnosticsPanel labels={requestLabels} />
          </Suspense>

          <WebRtcLeakTest labels={webRtcLabels} />

          <ToolDetails
            title={translate("About this tool")}
            description={description}
            sections={[
              {
                title: translate("How it works"),
                description: requestBehavior,
                items: [
                  requestLabels.observedIpAddress,
                  requestLabels.locationHeading,
                  requestLabels.headersHeading,
                ],
              },
              {
                title: translate("Privacy and security"),
                description: privacy,
                items: [locationDescription, headersDescription, webRtcLabels.description],
              },
            ]}
          />
        </div>
      </PageContainer>
    </PageShell>
  );
}
