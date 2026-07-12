interface RateLimitOptions {
  identifier: string;
  maximumRequests: number;
  scope: string;
  windowMilliseconds: number;
}

const maximumTrackedBuckets = 2_000;
const requestHistory = new Map<string, number[]>();

export async function isRateLimited(options: RateLimitOptions): Promise<boolean> {
  const durableResult = await checkDurableRateLimit(options);
  return durableResult ?? checkLocalRateLimit(options);
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

async function checkDurableRateLimit({
  identifier,
  maximumRequests,
  scope,
  windowMilliseconds,
}: RateLimitOptions): Promise<boolean | undefined> {
  const restUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!restUrl || !restToken) return undefined;

  const identifierHash = createHash("sha256").update(identifier).digest("hex").slice(0, 24);
  const windowNumber = Math.floor(Date.now() / windowMilliseconds);
  const bucketKey = `rate-limit:${scope}:${identifierHash}:${windowNumber}`;

  try {
    const response = await fetch(`${restUrl}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${restToken}`, "Content-Type": "application/json" },
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
import { createHash } from "node:crypto";
