import type { IncomingMessage, RequestOptions } from "node:http";

import "server-only";
import { request as requestHttp } from "node:http";
import { request as requestHttps } from "node:https";
import { StringDecoder } from "node:string_decoder";

import { PreviewError } from "./preview-error";
import { validatePublicUrl } from "./validate-public-url";

const maximumRedirects = 3;
const maximumResponseBytes = 1_000_000;
const requestTimeoutMilliseconds = 8_000;
const headEndPattern = /<\/head\s{0,64}>/i;
const headEndSearchOverlap = 80;

export interface PageHtmlResponse {
  html: string;
  url: URL;
}

export async function fetchPageHtml(value: string): Promise<PageHtmlResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(function abortPreview() {
    controller.abort();
  }, requestTimeoutMilliseconds);
  try {
    return await requestPage(value, 0, controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function requestPage(
  value: string,
  redirectCount: number,
  signal: AbortSignal,
): Promise<PageHtmlResponse> {
  const validatedUrl = await validatePublicUrl(value, signal);
  const requestFunction = validatedUrl.url.protocol === "https:" ? requestHttps : requestHttp;

  return new Promise(function executeRequest(resolve, reject) {
    const options: RequestOptions = {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Encoding": "identity",
        "User-Agent": "StriedingerMetadataPreview/1.0 (+https://striedinger.co/og)",
      },
      lookup(_hostname, lookupOptions, callback) {
        if (lookupOptions.all) {
          callback(null, [
            {
              address: validatedUrl.address,
              family: validatedUrl.family,
            },
          ]);
          return;
        }

        callback(null, validatedUrl.address, validatedUrl.family);
      },
      method: "GET",
      signal,
    };

    const request = requestFunction(validatedUrl.url, options, function handleResponse(response) {
      void processResponse(response, validatedUrl.url, redirectCount, signal).then(resolve, reject);
    });

    request.setTimeout(requestTimeoutMilliseconds, function handleTimeout() {
      request.destroy(new PreviewError("unreachable"));
    });
    request.on("error", function handleRequestError(error) {
      reject(error instanceof PreviewError ? error : new PreviewError("unreachable"));
    });
    request.end();
  });
}

async function processResponse(
  response: IncomingMessage,
  requestedUrl: URL,
  redirectCount: number,
  signal: AbortSignal,
): Promise<PageHtmlResponse> {
  const statusCode = response.statusCode ?? 0;
  const location = response.headers.location;

  if (statusCode >= 300 && statusCode < 400 && location) {
    response.destroy();

    if (redirectCount >= maximumRedirects) {
      throw new PreviewError("unreachable");
    }

    const redirectUrl = new URL(location, requestedUrl);
    return requestPage(redirectUrl.toString(), redirectCount + 1, signal);
  }

  if (statusCode < 200 || statusCode >= 300) {
    response.destroy();
    throw new PreviewError("unreachable");
  }

  const contentType = response.headers["content-type"]?.toLowerCase() ?? "";

  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    response.destroy();
    throw new PreviewError("not-html");
  }

  const decoder = new StringDecoder("utf8");
  let html = "";
  let receivedBytes = 0;

  for await (const chunk of response) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    receivedBytes += buffer.length;

    if (receivedBytes > maximumResponseBytes) {
      response.destroy();
      throw new PreviewError("too-large");
    }

    // Only the new text and enough before it to complete a split "</head>" are searched, so
    // the scan stays linear across chunks.
    const searchStart = Math.max(0, html.length - headEndSearchOverlap);
    html += decoder.write(buffer);

    const headEndMatch = headEndPattern.exec(html.slice(searchStart));

    if (headEndMatch) {
      response.destroy();
      return {
        html: html.slice(0, searchStart + headEndMatch.index + headEndMatch[0].length),
        url: requestedUrl,
      };
    }
  }

  return {
    html: html + decoder.end(),
    url: requestedUrl,
  };
}
