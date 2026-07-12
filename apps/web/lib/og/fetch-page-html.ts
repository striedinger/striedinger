import { request as requestHttp } from "node:http";
import { request as requestHttps } from "node:https";
import type { IncomingMessage, RequestOptions } from "node:http";
import { StringDecoder } from "node:string_decoder";
import { PreviewError } from "./preview-error";
import { validatePublicUrl } from "./validate-public-url";

const maximumRedirects = 3;
const maximumResponseBytes = 1_000_000;
const requestTimeoutMilliseconds = 8_000;

export interface PageHtmlResponse {
  html: string;
  url: URL;
}

export async function fetchPageHtml(value: string): Promise<PageHtmlResponse> {
  return requestPage(value, 0);
}

async function requestPage(value: string, redirectCount: number): Promise<PageHtmlResponse> {
  const validatedUrl = await validatePublicUrl(value);
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
    };

    const request = requestFunction(validatedUrl.url, options, function handleResponse(response) {
      void processResponse(response, validatedUrl.url, redirectCount).then(resolve, reject);
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
): Promise<PageHtmlResponse> {
  const statusCode = response.statusCode ?? 0;
  const location = response.headers.location;

  if (statusCode >= 300 && statusCode < 400 && location) {
    response.resume();

    if (redirectCount >= maximumRedirects) {
      throw new PreviewError("unreachable");
    }

    const redirectUrl = new URL(location, requestedUrl);
    return requestPage(redirectUrl.toString(), redirectCount + 1);
  }

  if (statusCode < 200 || statusCode >= 300) {
    response.resume();
    throw new PreviewError("unreachable");
  }

  const contentType = response.headers["content-type"]?.toLowerCase() ?? "";

  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
    response.resume();
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

    html += decoder.write(buffer);

    const headEndMatch = html.match(/<\/head\s*>/i);

    if (headEndMatch?.index !== undefined) {
      response.destroy();
      return {
        html: html.slice(0, headEndMatch.index + headEndMatch[0].length),
        url: requestedUrl,
      };
    }
  }

  return {
    html: html + decoder.end(),
    url: requestedUrl,
  };
}
