import type { Metadata } from "next";

import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";

import type { PdfToolLabels } from "./types";

import { JsonLd } from "../../components/json-ld";
import { getPdfTranslator } from "../../messages/pdf/get-translator";
import { getRequestLocale } from "../get-request-locale";
import { PdfTool } from "./pdf-tool";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getPdfTranslator(locale);
  const title = translate("PDF Optimizer");
  const description = translate(
    "Compress, preview, and remove PDF restrictions entirely in your browser.",
  );

  return {
    title,
    description,
    alternates: { canonical: "/pdf" },
    openGraph: {
      type: "website",
      url: "/pdf",
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

export default async function PdfPage() {
  const locale = await getRequestLocale();
  const translate = await getPdfTranslator(locale);
  const labels: PdfToolLabels = {
    balanced: translate("Balanced"),
    chooseFile: translate("Choose PDF"),
    compress: translate("Compress PDF"),
    compressionMode: translate("Compression mode"),
    description: translate(
      "Compress, preview, and remove PDF restrictions entirely in your browser.",
    ),
    download: translate("Download"),
    dropActive: translate("Drop PDF to start"),
    dropPrompt: translate("Drop a PDF here"),
    enterPassword: translate("This PDF is locked. Enter its password to preview it."),
    fileStaysLocal: translate("Your PDF stays on this device."),
    incorrectPassword: translate("That password did not open this PDF."),
    loadingPreview: translate("Rendering preview"),
    lossless: translate("Lossless rewrite"),
    noSmallerResult: translate("The original was already smaller"),
    open: translate("Open PDF"),
    pages: translate("pages"),
    password: translate("PDF password"),
    passwordHelp: translate("Enter a password you are authorized to use. It is never stored."),
    preview: translate("Preview"),
    processing: translate("Preparing PDF"),
    removeLock: translate("Remove restrictions"),
    replaceFile: translate("Choose another"),
    result: translate("Optimized PDF"),
    saved: translate("smaller"),
    smallest: translate("Smallest file"),
    supported: translate("One PDF at a time · processed locally"),
    title: translate("PDF Optimizer"),
    unlockComplete: translate("Restrictions removed"),
    unsupported: translate("This PDF could not be opened in your browser."),
  };
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: labels.title,
    description: labels.description,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript and WebAssembly",
    url: "https://striedinger.co/pdf",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <PageShell>
      <JsonLd value={structuredData} />
      <PageContainer>
        <div className="flex flex-col gap-12">
          <PageHeader title={labels.title} description={labels.description} />
          <PdfTool labels={labels} />
        </div>
      </PageContainer>
    </PageShell>
  );
}
