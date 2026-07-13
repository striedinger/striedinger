import type { Metadata } from "next";

import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";

import type { JsonToolLabels } from "./types";

import { JsonLd } from "../../components/json-ld";
import { getJsonTranslator } from "../../messages/json/get-translator";
import { getRequestLocale } from "../get-request-locale";
import { JsonTool } from "./json-tool";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getJsonTranslator(locale);
  const title = translate("JSON Validator and Formatter");
  const description = translate(
    "Validate, format, and explore JSON entirely in your browser. Your data never leaves this device.",
  );

  return {
    title,
    description,
    alternates: { canonical: "/json" },
    openGraph: {
      type: "website",
      url: "/json",
      locale,
      siteName: "Hugo Striedinger",
      title,
      description,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      creator: "@striedinger",
      title,
      description,
      images: ["/opengraph-image"],
    },
    robots: { index: true, follow: true },
  };
}

export default async function JsonPage() {
  const locale = await getRequestLocale();
  const translate = await getJsonTranslator(locale);
  const labels: JsonToolLabels = {
    collapseAll: translate("Collapse all"),
    collapseValue: translate("Collapse value"),
    description: translate(
      "Validate, format, and explore JSON entirely in your browser. Your data never leaves this device.",
    ),
    emptyPreview: translate("Enter valid JSON to see an expandable preview."),
    expandAll: translate("Expand all"),
    expandValue: translate("Expand value"),
    inputLabel: translate("JSON input"),
    invalid: translate("Invalid JSON: {error}"),
    placeholder: translate("Paste JSON here"),
    preview: translate("Preview"),
    privacy: translate("Your JSON stays in this browser and is never sent to the server."),
    title: translate("JSON Validator and Formatter"),
    valid: translate("Valid JSON"),
    tooLarge: translate("This JSON is too large to process safely in the browser."),
    tooComplex: translate("This JSON is valid but too complex to preview all at once."),
  };
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: labels.title,
    description: labels.description,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    url: "https://striedinger.co/json",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <PageShell>
      <JsonLd value={structuredData} />
      <PageContainer>
        <div className="flex flex-col gap-12">
          <PageHeader title={labels.title} description={labels.description} />

          <JsonTool labels={labels} />
        </div>
      </PageContainer>
    </PageShell>
  );
}
