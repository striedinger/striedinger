import type { Metadata } from "next";

import type { OgPreviewLabels } from "../../../lib/og/labels";

import { JsonLd } from "../../../components/json-ld";
import { localizePath } from "../../../lib/locale-path";
import { createPageMetadata, createWebApplicationStructuredData } from "../../../lib/seo";
import { getOgTranslator } from "../../../messages/og/get-translator";
import { getRequestLocale } from "../../get-request-locale";
import { loadPreviewMetadata } from "./load-preview-metadata";
import { OgPreviewForm } from "./og-preview-form";

interface OpenGraphPreviewPageProps {
  searchParams: Promise<{
    url?: string | string[];
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getOgTranslator(locale);
  const title = translate("Open Graph Checker and Social Card Preview");
  const description = translate(
    "Preview Open Graph and X cards for any public URL. Inspect titles, descriptions, images, and raw social metadata with a fast, secure online tester.",
  );

  return createPageMetadata({ title, description, locale, path: "/og" });
}

export default async function OpenGraphPreviewPage({ searchParams }: OpenGraphPreviewPageProps) {
  const [resolvedSearchParams, locale] = await Promise.all([searchParams, getRequestLocale()]);
  const requestedUrl = Array.isArray(resolvedSearchParams.url)
    ? resolvedSearchParams.url[0]
    : resolvedSearchParams.url;
  const initialUrl = requestedUrl?.slice(0, 2048).trim() ?? "";
  const translate = await getOgTranslator(locale);

  const labels: OgPreviewLabels = {
    button: translate("Preview cards"),
    checking: translate("Checking…"),
    description: translate(
      "Enter any public URL to inspect its Open Graph and X metadata, preview its social cards, and review the tags found in the page.",
    ),
    errors: {
      "invalid-url": translate("Enter a valid absolute URL, including http:// or https://."),
      "unsafe-url": translate(
        "That address is not allowed. Private, local, and non-standard network targets are blocked.",
      ),
      unreachable: translate("That page could not be reached within the allowed time."),
      "not-html": translate("The response was not an HTML page."),
      "too-large": translate("The HTML response was too large to inspect safely."),
      "missing-metadata": translate("No usable social metadata was found on that page."),
      "rate-limited": translate(
        "Too many previews were requested. Please wait a minute and try again.",
      ),
    },
    from: translate("From"),
    heading: translate("Open Graph Preview"),
    metadata: translate("Detected metadata"),
    metadataDescription: translate(
      "All usable meta tags, document title, and canonical URL found in the page head.",
    ),
    openGraph: translate("Open Graph preview"),
    previewRegion: translate("Social card previews"),
    previewing: translate("Previewing {url} ({duration} ms)"),
    security: translate(
      "Only public HTTP(S) pages on standard ports are fetched. Private networks, local addresses, credentials, oversized responses, and unsafe redirects are blocked.",
    ),
    twitter: translate("X / Twitter card preview"),
    urlLabel: translate("URL to preview"),
    urlPlaceholder: translate("https://example.com"),
  };
  const structuredData = createWebApplicationStructuredData({
    name: translate("Open Graph Preview"),
    description: translate(
      "Preview Open Graph and X cards for any public URL. Inspect titles, descriptions, images, and raw social metadata with a fast, secure online tester.",
    ),
    applicationCategory: "DeveloperApplication",
    featureList: [labels.openGraph, labels.twitter, labels.previewRegion, labels.metadata],
    locale,
    path: "/og",
  });

  return (
    <>
      <JsonLd value={structuredData} />
      <OgPreviewForm
        action={localizePath("/og", locale)}
        defaultUrl={initialUrl}
        labels={labels}
        preview={initialUrl ? loadPreviewMetadata(initialUrl) : null}
      />
    </>
  );
}
