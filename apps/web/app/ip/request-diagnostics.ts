import { isIP } from "node:net";

import type { IpDiagnosticRow, RequestDiagnostics } from "./types";

interface RequestDiagnosticLabels {
  city: string;
  country: string;
  forwardedAddresses: string;
  host: string;
  ipVersionFour: string;
  ipVersionSix: string;
  latitude: string;
  longitude: string;
  protocol: string;
  region: string;
  timeZone: string;
  unavailable: string;
}

interface HeadersLike {
  get(name: string): string | null;
}

const visibleRequestHeaders = [
  "accept",
  "accept-encoding",
  "accept-language",
  "dnt",
  "priority",
  "sec-ch-ua",
  "sec-ch-ua-mobile",
  "sec-ch-ua-platform",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "sec-fetch-user",
  "user-agent",
] as const;

export function collectRequestDiagnostics(
  requestHeaders: HeadersLike,
  labels: RequestDiagnosticLabels,
): RequestDiagnostics {
  const forwardedAddresses =
    requestHeaders.get("x-vercel-forwarded-for") ?? requestHeaders.get("x-forwarded-for") ?? "";
  const ipAddress = getClientIp(requestHeaders) || labels.unavailable;
  const ipFamily = isIP(ipAddress);

  return {
    ipAddress,
    ipVersion:
      ipFamily === 4
        ? labels.ipVersionFour
        : ipFamily === 6
          ? labels.ipVersionSix
          : labels.unavailable,
    location: [
      row(labels.country, requestHeaders.get("x-vercel-ip-country"), labels.unavailable),
      row(labels.region, requestHeaders.get("x-vercel-ip-country-region"), labels.unavailable),
      row(
        labels.city,
        decodeHeaderValue(requestHeaders.get("x-vercel-ip-city")),
        labels.unavailable,
      ),
      row(labels.timeZone, requestHeaders.get("x-vercel-ip-timezone"), labels.unavailable),
      row(labels.latitude, requestHeaders.get("x-vercel-ip-latitude"), labels.unavailable),
      row(labels.longitude, requestHeaders.get("x-vercel-ip-longitude"), labels.unavailable),
    ],
    request: [
      row(labels.protocol, requestHeaders.get("x-forwarded-proto") ?? "https", labels.unavailable),
      row(
        labels.host,
        requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
        labels.unavailable,
      ),
      row(
        labels.forwardedAddresses,
        forwardedAddresses
          ? forwardedAddresses
              .split(",")
              .map(function trimForwardedAddress(address) {
                return address.trim();
              })
              .join(" → ")
          : null,
        labels.unavailable,
      ),
    ],
    headers: visibleRequestHeaders.flatMap(function createVisibleHeader(headerName) {
      const value = requestHeaders.get(headerName);
      return value ? [row(headerName, value, labels.unavailable)] : [];
    }),
  };
}

export function getClientIp(requestHeaders: HeadersLike): string {
  const forwardedAddress =
    requestHeaders.get("x-vercel-forwarded-for") ??
    requestHeaders.get("x-forwarded-for") ??
    requestHeaders.get("cf-connecting-ip") ??
    requestHeaders.get("x-real-ip") ??
    "";

  return forwardedAddress.split(",")[0]?.trim() ?? "";
}

function decodeHeaderValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function row(label: string, value: string | null, unavailable: string): IpDiagnosticRow {
  const displayValue = value || unavailable;
  return {
    label,
    value: displayValue.length > 4_096 ? `${displayValue.slice(0, 4_096)}…` : displayValue,
  };
}
