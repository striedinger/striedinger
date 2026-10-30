import "server-only";
import { getUpstashRestCredentials } from "../../lib/upstash-rest-credentials";

// Changing the label rotates every signature, so links signed under the old one fall back to
// the confirmation page.
const keyDerivationLabel = "card-link-v1";
const textEncoder = new TextEncoder();

/** The target as an absolute http(s) URL in the one spelling signatures cover, if it is one. */
export function canonicalizeCardTarget(value: string): string | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/** The tracked path to share for a target, signed whenever a secret is available. */
export async function createCardLinkPath(canonicalTargetUrl: string): Promise<string> {
  const query = new URLSearchParams({ url: canonicalTargetUrl });
  const signature = await signCardLink(canonicalTargetUrl);
  if (signature) query.set("sig", signature);

  return `/r?${query.toString()}`;
}

/** The signature for a tracked link to the target, or undefined when no secret is configured. */
async function signCardLink(canonicalTargetUrl: string): Promise<string | undefined> {
  const signingKey = await getSigningKey();
  if (!signingKey) return undefined;

  const signature = await crypto.subtle.sign(
    "HMAC",
    signingKey,
    textEncoder.encode(canonicalTargetUrl),
  );
  return Buffer.from(signature).toString("base64url");
}

export async function isValidCardLinkSignature(
  canonicalTargetUrl: string,
  signature: string,
): Promise<boolean> {
  const signingKey = await getSigningKey();
  if (!signingKey) return false;

  // Web Crypto's verify compares in constant time, so the response time leaks nothing.
  return crypto.subtle.verify(
    "HMAC",
    signingKey,
    Buffer.from(signature, "base64url"),
    textEncoder.encode(canonicalTargetUrl),
  );
}

/**
 * A dedicated CARD_LINK_SECRET when one is set, otherwise the Redis token the deployment already
 * has. Either way the key is derived under a fixed label, so it never equals the token itself.
 */
async function getSigningKey(): Promise<CryptoKey | undefined> {
  const secret = process.env.CARD_LINK_SECRET ?? getUpstashRestCredentials()?.token;
  if (!secret) return undefined;

  const secretKey = await importHmacKey(textEncoder.encode(secret), ["sign"]);
  const derivedKey = await crypto.subtle.sign(
    "HMAC",
    secretKey,
    textEncoder.encode(keyDerivationLabel),
  );
  return importHmacKey(derivedKey, ["sign", "verify"]);
}

function importHmacKey(keyBytes: BufferSource, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, usages);
}
