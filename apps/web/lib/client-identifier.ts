import { headers } from "next/headers";
import "server-only";
import { isIPv4, isIPv6 } from "node:net";

const maximumUnparsedIdentifierLength = 64;

/** The visitor's address from the proxy's forwarding headers, which keys per-visitor limits. */
export async function getClientIdentifier() {
  return getClientIdentifierFromHeaders(await headers());
}

export function getClientIdentifierFromHeaders(requestHeaders: Headers): string {
  const forwardedAddress =
    requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();

  return forwardedAddress ? normalizeClientAddress(forwardedAddress) : "unknown";
}

/**
 * IPv4 addresses key on themselves. IPv6 addresses key on their /64 prefix, because a single
 * subscriber usually holds a whole /64 and could otherwise rotate through it to dodge limits.
 */
export function normalizeClientAddress(address: string): string {
  const unbracketedAddress = address.replace(/^\[(.*)\]$/, "$1").replace(/%.*$/, "");

  if (isIPv4(unbracketedAddress)) return unbracketedAddress;
  if (!isIPv6(unbracketedAddress)) return address.slice(0, maximumUnparsedIdentifierLength);

  const groups = expandIpv6Groups(unbracketedAddress.toLowerCase());
  const isIpv4Mapped = groups.slice(0, 5).every(isZeroGroup) && groups[5] === 0xff_ff;

  if (isIpv4Mapped) {
    const [high = 0, low = 0] = groups.slice(6);
    return [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
  }

  return `${groups
    .slice(0, 4)
    .map(function formatGroup(group) {
      return group.toString(16);
    })
    .join(":")}::/64`;
}

/** The eight 16-bit groups of an address Node has already validated as IPv6. */
function expandIpv6Groups(address: string): number[] {
  const embeddedIpv4 = address.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  const hexAddress = embeddedIpv4
    ? address.slice(0, embeddedIpv4.index) + formatEmbeddedIpv4(embeddedIpv4.slice(1))
    : address;
  const [leading = "", trailing] = hexAddress.split("::");
  const leadingGroups = parseHexGroups(leading);
  const trailingGroups = trailing === undefined ? [] : parseHexGroups(trailing);
  const zeroGroups = Array.from<number>({
    length: 8 - leadingGroups.length - trailingGroups.length,
  }).fill(0);

  return [...leadingGroups, ...zeroGroups, ...trailingGroups];
}

function formatEmbeddedIpv4(octets: string[]): string {
  const [first = 0, second = 0, third = 0, fourth = 0] = octets.map(Number);
  return `${((first << 8) | second).toString(16)}:${((third << 8) | fourth).toString(16)}`;
}

function parseHexGroups(value: string): number[] {
  return value === ""
    ? []
    : value.split(":").map(function parseGroup(group) {
        return Number.parseInt(group, 16);
      });
}

function isZeroGroup(group: number): boolean {
  return group === 0;
}
