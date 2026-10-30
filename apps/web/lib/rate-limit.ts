import { createHash } from "node:crypto";
import "server-only";

import type { UpstashRestCredentials } from "./upstash-rest-credentials";

import { getUpstashRestCredentials } from "./upstash-rest-credentials";

interface RateLimitOptions {
  /**
   * Counts the request as limited when the shared store is configured but fails to answer.
   * Scopes that guard expensive work set it, since a per-instance fallback lets a burst through
   * every instance it lands on.
   */
  failClosed?: boolean;
  identifier: string;
  maximumRequests: number;
  scope: string;
  windowMilliseconds: number;
}

const maximumTrackedBuckets = 2_000;
const requestHistory = new Map<string, number[]>();

export async function isRateLimited(options: RateLimitOptions): Promise<boolean> {
  const credentials = getUpstashRestCredentials();
  if (!credentials) return checkLocalRateLimit(options);

  const durableResult = await checkDurableRateLimit(credentials, options);
  if (durableResult !== undefined) return durableResult;

  return options.failClosed === true || checkLocalRateLimit(options);
}

function checkLocalRateLimit({
  identifier,
  maximumRequests,
  scope,
  windowMilliseconds,
}: RateLimitOptions): boolean {
  const now = Date.now();
  const bucketKey = `${scope}:${identifier}`;
  const windowStart = now - windowMilliseconds;
  const recentRequests = (requestHistory.get(bucketKey) ?? []).filter(function isRecent(timestamp) {
    return timestamp > windowStart;
  });

  if (recentRequests.length >= maximumRequests) return true;

  recentRequests.push(now);
  requestHistory.delete(bucketKey);
  requestHistory.set(bucketKey, recentRequests);

  if (requestHistory.size > maximumTrackedBuckets) {
    const oldestBucket = requestHistory.keys().next().value;
    if (oldestBucket) requestHistory.delete(oldestBucket);
  }

  return false;
}

/** The store's verdict, or undefined when it could not give one. */
async function checkDurableRateLimit(
  credentials: UpstashRestCredentials,
  { identifier, maximumRequests, scope, windowMilliseconds }: RateLimitOptions,
): Promise<boolean | undefined> {
  const identifierHash = createHash("sha256").update(identifier).digest("hex").slice(0, 24);
  const windowNumber = Math.floor(Date.now() / windowMilliseconds);
  const bucketKey = `rate-limit:${scope}:${identifierHash}:${windowNumber}`;

  try {
    const response = await fetch(`${credentials.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${credentials.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", bucketKey],
        ["PEXPIRE", bucketKey, windowMilliseconds * 2, "NX"],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(1_500),
    });
    if (!response.ok) return undefined;

    const results = (await response.json()) as Array<{ result?: number }>;
    const requestCount = Number(results[0]?.result);
    return Number.isFinite(requestCount) ? requestCount > maximumRequests : undefined;
  } catch {
    return undefined;
  }
}
