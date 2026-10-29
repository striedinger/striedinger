import "server-only";
import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

import { PreviewError } from "./preview-error";

export interface ValidatedPublicUrl {
  address: string;
  family: 4 | 6;
  url: URL;
}

const blockedHostnameSuffixes = [".internal", ".local", ".localhost", ".home.arpa"];
const globalIpv6Addresses = new BlockList();
globalIpv6Addresses.addSubnet("2000::", 3, "ipv6");
const specialIpv6Addresses = new BlockList();
// IANA special-purpose ranges, including tunneling and documentation networks.
specialIpv6Addresses.addSubnet("2001::", 23, "ipv6");
specialIpv6Addresses.addSubnet("2001:db8::", 32, "ipv6");
specialIpv6Addresses.addSubnet("2002::", 16, "ipv6");
specialIpv6Addresses.addSubnet("3fff::", 20, "ipv6");

export async function validatePublicUrl(
  value: string,
  signal: AbortSignal = AbortSignal.timeout(8_000),
): Promise<ValidatedPublicUrl> {
  if (signal.aborted) throw new PreviewError("unreachable");
  if (!value || value.length > 2048) {
    throw new PreviewError("invalid-url");
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new PreviewError("invalid-url");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new PreviewError("invalid-url");
  }

  if (url.username || url.password || !url.hostname) {
    throw new PreviewError("unsafe-url");
  }

  const expectedPort = url.protocol === "https:" ? "443" : "80";

  if (url.port && url.port !== expectedPort) {
    throw new PreviewError("unsafe-url");
  }

  const hostname = url.hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")
    .toLowerCase();

  if (
    hostname === "localhost" ||
    hostname === "metadata.google.internal" ||
    blockedHostnameSuffixes.some(function hasBlockedHostnameSuffix(suffix) {
      return hostname.endsWith(suffix);
    })
  ) {
    throw new PreviewError("unsafe-url");
  }

  const literalFamily = isIP(hostname);

  if (literalFamily) {
    assertPublicAddress(hostname);
    return { address: hostname, family: literalFamily as 4 | 6, url };
  }

  let addresses: Array<{ address: string; family: 4 | 6 }>;

  try {
    addresses = await new Promise(function resolveWithinDeadline(resolve, reject) {
      function abortLookup() {
        reject(new PreviewError("unreachable"));
      }
      signal.addEventListener("abort", abortLookup, { once: true });
      void lookup(hostname, { all: true, order: "verbatim" }).then(
        function resolved(result) {
          signal.removeEventListener("abort", abortLookup);
          resolve(result as Array<{ address: string; family: 4 | 6 }>);
          return undefined;
        },
        function failed() {
          signal.removeEventListener("abort", abortLookup);
          reject(new PreviewError("unreachable"));
          return undefined;
        },
      );
    });
  } catch {
    throw new PreviewError("unreachable");
  }

  const selectedAddress = addresses[0];
  if (!selectedAddress) {
    throw new PreviewError("unreachable");
  }

  for (const resolvedAddress of addresses) {
    assertPublicAddress(resolvedAddress.address);
  }

  return {
    address: selectedAddress.address,
    family: selectedAddress.family,
    url,
  };
}

function assertPublicAddress(address: string) {
  if (isBlockedAddress(address)) {
    throw new PreviewError("unsafe-url");
  }
}

function isBlockedAddress(address: string): boolean {
  // An empty address is not an IP, so it is blocked below.
  const [normalizedAddress = ""] = address.toLowerCase().split("%");
  const family = isIP(normalizedAddress);

  if (family === 4) {
    return isBlockedIpv4(normalizedAddress);
  }

  if (family !== 6) {
    return true;
  }

  return (
    !globalIpv6Addresses.check(normalizedAddress, "ipv6") ||
    specialIpv6Addresses.check(normalizedAddress, "ipv6")
  );
}

function isBlockedIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);

  if (octets.length !== 4 || octets.some(Number.isNaN)) {
    return true;
  }

  const [first, second, third] = octets as [number, number, number, number];

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 168) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  );
}
