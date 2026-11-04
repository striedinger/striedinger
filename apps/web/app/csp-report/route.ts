import type { NextRequest } from "next/server";

import { getClientIdentifierFromHeaders } from "../../lib/client-identifier";
import { isRateLimited } from "../../lib/rate-limit";
import { readCspViolations } from "./read-csp-violations";

const maximumBodyBytes = 64 * 1024;
const maximumRememberedViolations = 500;
// Browsers repeat a violation on every page view, so each instance logs one only once.
const loggedViolationKeys = new Set<string>();

/**
 * Collects the browser's reports for the report-only Content Security Policy and writes each new
 * violation to the server logs, where they show what an enforced policy would block.
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > maximumBodyBytes) return new Response(null, { status: 413 });

  const text = await request.text();
  if (text.length > maximumBodyBytes) return new Response(null, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }

  const limited = await isRateLimited({
    identifier: getClientIdentifierFromHeaders(request.headers),
    maximumRequests: 30,
    scope: "csp-report",
    windowMilliseconds: 60_000,
  });
  if (limited) return new Response(null, { status: 204 });

  for (const violation of readCspViolations(contentType, body)) {
    const key = `${violation.directive} ${violation.blocked} ${violation.document}`;
    if (loggedViolationKeys.has(key)) continue;
    if (loggedViolationKeys.size >= maximumRememberedViolations) loggedViolationKeys.clear();
    loggedViolationKeys.add(key);
    // oxlint-disable-next-line no-console -- the server logs are where violation reports are read
    console.warn(JSON.stringify({ event: "csp-violation", ...violation }));
  }

  return new Response(null, { status: 204 });
}
