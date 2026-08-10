import type { Metadata } from "next";

import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";

import type { PdfToolLabels } from "./types";

import { JsonLd } from "../../components/json-ld";
import { ToolDetails } from "../../components/tool-details";
import { createPageMetadata, createWebApplicationStructuredData } from "../../lib/seo";
import { getPdfTranslator } from "../../messages/pdf/get-translator";
import { getRequestLocale } from "../get-request-locale";
import { PdfTool } from "./pdf-tool";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getPdfTranslator(locale);
  const title = translate("PDF Compressor and Optimizer");
  const description = translate(
    "Compress, preview, and remove PDF restrictions entirely in your browser.",
  );

  return createPageMetadata({ title, description, locale, path: "/pdf" });
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
  const structuredData = createWebApplicationStructuredData({
    name: labels.title,
    description: labels.description,
    applicationCategory: "UtilitiesApplication",
    browserRequirements: "Requires JavaScript and WebAssembly",
    featureList: [labels.fileStaysLocal, labels.preview, labels.removeLock, labels.supported],
    locale,
    path: "/pdf",
  });

  return (
    <PageShell>
      <JsonLd value={structuredData} />
      <PageContainer>
        <div className="flex flex-col gap-12">
          <PageHeader title={labels.title} description={labels.description} />
          <PdfTool labels={labels} />
          <ToolDetails
            title={translate("About this tool")}
            description={labels.description}
            sections={[
              {
                title: translate("How it works"),
                description: labels.description,
                items: [labels.balanced, labels.lossless, labels.smallest],
              },
              {
                title: translate("Privacy and security"),
                description: labels.fileStaysLocal,
                items: [labels.supported, labels.passwordHelp],
              },
              {
                title: translate("Features"),
                description: labels.result,
                items: [labels.preview, labels.removeLock, labels.download],
              },
            ]}
          />
        </div>
      </PageContainer>
    </PageShell>
  );
}
