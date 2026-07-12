import type { Metadata } from "next";

import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Text } from "@workspace/ui/components/text";

import type { OgPreviewLabels } from "../../lib/og/labels";
import type { PreviewState } from "../../lib/og/types";

import { getOgTranslator } from "../../messages/og/get-translator";
import { getRequestLocale } from "../get-request-locale";
import { OgPreviewForm } from "./og-preview-form";

interface OpenGraphPreviewPageProps {
  searchParams: Promise<{
    url?: string | string[];
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getOgTranslator(locale);
  const title = translate("Open Graph Preview");
  const description = translate(
    "Preview Open Graph and X cards for any public URL. Inspect titles, descriptions, images, and raw social metadata with a fast, secure online tester.",
  );

  return {
    title,
    description,
    alternates: {
      canonical: "/og",
    },
    openGraph: {
      type: "website",
      url: "/og",
      locale,
      title,
      description,
      siteName: "Hugo Striedinger",
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@striedinger",
      images: ["/opengraph-image"],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function OpenGraphPreviewPage({ searchParams }: OpenGraphPreviewPageProps) {
  const resolvedSearchParams = await searchParams;
  const requestedUrl = Array.isArray(resolvedSearchParams.url)
    ? resolvedSearchParams.url[0]
    : resolvedSearchParams.url;
  const initialUrl = requestedUrl?.slice(0, 2048) ?? "";
  const locale = await getRequestLocale();
  const translate = await getOgTranslator(locale);
  const initialState: PreviewState = { status: "idle", url: initialUrl };
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
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: translate("Open Graph Preview"),
    description: translate(
      "Preview Open Graph and X cards for any public URL. Inspect titles, descriptions, images, and raw social metadata with a fast, secure online tester.",
    ),
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    url: "https://striedinger.co/og",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <PageContainer>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-24">
          <div className="flex flex-col gap-12">
            <PageHeader title={labels.heading} description={labels.description} />

            <OgPreviewForm key={initialUrl} initialState={initialState} labels={labels} />
          </div>

          <section className="flex flex-col gap-6 border-t border-border/70 pt-12">
            <Text as="h2" size="2xl" weight="semibold">
              {translate("Test Open Graph and X metadata")}
            </Text>
            <Text tone="muted" className="max-w-2xl leading-relaxed">
              {translate(
                "Check how a public page may appear when shared, including its title, description, preview image, site name, card type, and detected social tags.",
              )}
            </Text>
          </section>
        </div>
      </PageContainer>
    </PageShell>
  );
}
