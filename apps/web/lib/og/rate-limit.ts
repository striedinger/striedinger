import { isRateLimited } from "../rate-limit";
import { PreviewError } from "./preview-error";

const maximumRequestsPerWindow = 10;
const rateLimitWindowMilliseconds = 60_000;

export async function enforcePreviewRateLimit(identifier: string) {
  if (
    await isRateLimited({
      identifier,
      maximumRequests: maximumRequestsPerWindow,
      scope: "og-preview",
      windowMilliseconds: rateLimitWindowMilliseconds,
    })
  ) {
    throw new PreviewError("rate-limited");
  }
}
