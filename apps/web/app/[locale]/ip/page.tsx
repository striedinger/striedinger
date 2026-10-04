import type { Metadata } from "next";

import { Suspense } from "react";

import type { WebRtcLabels } from "./types";

import { IosToolScreen } from "../../../components/ios/ios-tool-screen";
import { JsonLd } from "../../../components/json-ld";
import { createPageMetadata, createWebApplicationStructuredData } from "../../../lib/seo";
import { getIpTranslator } from "../../../messages/ip/get-translator";
import { getRequestLocale } from "../../get-request-locale";
import { RequestDiagnosticsPanel } from "./request-diagnostics-panel";
import { RequestDiagnosticsSkeleton } from "./request-diagnostics-skeleton";
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
    copied: translate("Copied"),
    copyIpAddress: translate("Copy IP address"),
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
    privacy,
    protocol: translate("Protocol"),
    region: translate("Region"),
    requestHeading: translate("Request Details"),
    timeZone: translate("Time zone"),
    unavailable: translate("Unavailable"),
  };
  const webRtcLabels: WebRtcLabels = {
    address: translate("Address"),
    candidates: translate("ICE Candidates"),
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
    <>
      <JsonLd value={structuredData} />
      <IosToolScreen title={title}>
        <Suspense
          fallback={
            <RequestDiagnosticsSkeleton
              labels={{
                headersHeading: requestLabels.headersHeading,
                loading: translate("Loading request details…"),
                locationHeading: requestLabels.locationHeading,
                observedIpAddress: requestLabels.observedIpAddress,
                requestHeading: requestLabels.requestHeading,
              }}
            />
          }
        >
          <RequestDiagnosticsPanel labels={requestLabels} />
        </Suspense>
        <WebRtcLeakTest labels={webRtcLabels} />
      </IosToolScreen>
    </>
  );
}
