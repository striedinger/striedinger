import { PreviewError } from "./preview-error";

const maximumRequestsPerWindow = 10;
const maximumTrackedClients = 1_000;
const rateLimitWindowMilliseconds = 60_000;
const requestHistory = new Map<string, number[]>();

export function enforcePreviewRateLimit(identifier: string) {
  const now = Date.now();
  const windowStart = now - rateLimitWindowMilliseconds;
  const recentRequests = (requestHistory.get(identifier) ?? []).filter(function isRecent(timestamp) {
    return timestamp > windowStart;
  });

  if (recentRequests.length >= maximumRequestsPerWindow) {
    throw new PreviewError("rate-limited");
  }

  recentRequests.push(now);
  requestHistory.set(identifier, recentRequests);

  if (requestHistory.size > maximumTrackedClients) {
    const oldestIdentifier = requestHistory.keys().next().value;

    if (oldestIdentifier) {
      requestHistory.delete(oldestIdentifier);
    }
  }
}
