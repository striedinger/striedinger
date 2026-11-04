export interface CspViolation {
  blocked: string;
  directive: string;
  disposition: string;
  document: string;
  line: number | null;
  sample: string;
  source: string;
}

const maximumViolationsPerRequest = 20;

/**
 * Violations from a report body, in either format browsers send: the `report-uri` object or a
 * Reporting API batch. Unknown shapes yield nothing rather than an error, since anyone can post.
 */
export function readCspViolations(contentType: string, body: unknown): CspViolation[] {
  if (contentType.startsWith("application/csp-report")) {
    const report = readRecord(readRecord(body)?.["csp-report"]);
    return report ? [readLegacyReport(report)] : [];
  }
  if (!Array.isArray(body)) return [];

  return body.slice(0, maximumViolationsPerRequest).flatMap(function readReportingApiEntry(entry) {
    const report = readRecord(entry);
    const reportBody = readRecord(report?.["body"]);
    if (report?.["type"] !== "csp-violation" || !reportBody) return [];
    return [
      {
        blocked: describeLocation(reportBody["blockedURL"]),
        directive: readText(reportBody["effectiveDirective"], 60),
        disposition: readText(reportBody["disposition"], 20),
        document: describeLocation(reportBody["documentURL"]),
        line: readLine(reportBody["lineNumber"]),
        sample: readText(reportBody["sample"], 80),
        source: describeLocation(reportBody["sourceFile"]),
      },
    ];
  });
}

function readLegacyReport(report: Record<string, unknown>): CspViolation {
  return {
    blocked: describeLocation(report["blocked-uri"]),
    directive: readText(report["effective-directive"] ?? report["violated-directive"], 60),
    disposition: readText(report["disposition"], 20),
    document: describeLocation(report["document-uri"]),
    line: readLine(report["line-number"]),
    sample: readText(report["script-sample"], 80),
    source: describeLocation(report["source-file"]),
  };
}

/**
 * A URL reduced to its origin and path, so query strings (shared links, search terms) never
 * reach the logs. Keywords such as "inline", "eval", or "trusted-types-sink" pass through.
 */
function describeLocation(value: unknown): string {
  const text = readText(value, 2_048);
  try {
    const url = new URL(text);
    return `${url.origin}${url.pathname}`.slice(0, 200);
  } catch {
    return text.slice(0, 40);
  }
}

function readText(value: unknown, maximumLength: number): string {
  return typeof value === "string" ? value.slice(0, maximumLength) : "";
}

function readLine(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
