import "server-only";
import { isRateLimited } from "../rate-limit";
import { PreviewError } from "./preview-error";

const maximumRequestsPerWindow = 10;
const rateLimitWindowMilliseconds = 60_000;

export async function enforcePreviewRateLimit(identifier: string) {
  if (
    await isRateLimited({
      // Each preview fetches a remote page, so an unreachable store must not lift the limit.
      failClosed: true,
      identifier,
      maximumRequests: maximumRequestsPerWindow,
      scope: "og-preview",
      windowMilliseconds: rateLimitWindowMilliseconds,
    })
  ) {
    throw new PreviewError("rate-limited");
  }
}
