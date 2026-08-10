import type { Metadata } from "next";

import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";

import type { ImageOptimizerLabels } from "./types";

import { JsonLd } from "../../components/json-ld";
import { ToolDetails } from "../../components/tool-details";
import { createPageMetadata, createWebApplicationStructuredData } from "../../lib/seo";
import { getImageTranslator } from "../../messages/image/get-translator";
import { getRequestLocale } from "../get-request-locale";
import { ImageOptimizer } from "./image-optimizer";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getImageTranslator(locale);
  const title = translate("Image Compressor and Optimizer");
  const description = translate("Compress images privately in your browser. Nothing is uploaded.");

  return createPageMetadata({ title, description, locale, path: "/image" });
}

export default async function ImageOptimizerPage() {
  const locale = await getRequestLocale();
  const translate = await getImageTranslator(locale);
  const labels: ImageOptimizerLabels = {
    addMore: translate("Add more"),
    avif: "AVIF",
    auto: translate("Auto (smallest)"),
    autoTarget: translate("Auto size target"),
    balanced: translate("Optimizing"),
    balancedMode: translate("Balanced"),
    chooseFiles: translate("Choose files"),
    clearAll: translate("Clear all"),
    comparing: translate("Checking visual quality"),
    compressing: translate("Trying smaller formats"),
    compressionMode: translate("Compression mode"),
    decoding: translate("Decoding image"),
    description: translate("Compress images privately in your browser. Nothing is uploaded."),
    download: translate("Download"),
    downloadAll: translate("Download all"),
    dropActive: translate("Drop files to start"),
    dropPrompt: translate("Drop images here"),
    error: translate("Could not optimize"),
    format: translate("Image format"),
    jpeg: "JPEG",
    losslessMode: translate("Lossless"),
    maxDimension: translate("Maximum dimension"),
    original: translate("original"),
    output: translate("output"),
    preparing: translate("Preparing file"),
    png: "PNG",
    privacy: translate("Files stay on this device. Processing happens entirely in your browser."),
    quality: translate("Quality"),
    qualityHint: translate("Lower values create smaller files."),
    queue: translate("Files"),
    saved: translate("smaller"),
    smallerFilesKept: translate("No smaller result at this quality"),
    smallestMode: translate("Smallest file"),
    supported: translate("HEIC, HEIF, JPEG, PNG, WebP, AVIF, GIF, SVG, and BMP · up to 20 files"),
    title: translate("Image Optimizer"),
    tooManyFiles: translate("You can optimize up to 20 files at once."),
    unsupported: translate("One or more files use a format this browser cannot process."),
    webp: "WebP",
  };
  const structuredData = createWebApplicationStructuredData({
    name: labels.title,
    description: labels.description,
    applicationCategory: "MultimediaApplication",
    browserRequirements: "Requires JavaScript",
    featureList: [labels.privacy, labels.supported, labels.tooManyFiles, labels.qualityHint],
    locale,
    path: "/image",
  });

  return (
    <PageShell>
      <JsonLd value={structuredData} />
      <PageContainer>
        <div className="flex flex-col gap-12">
          <PageHeader title={labels.title} description={labels.description} />
          <ImageOptimizer labels={labels} />
          <ToolDetails
            title={translate("About this tool")}
            description={labels.description}
            sections={[
              {
                title: translate("How it works"),
                description: labels.qualityHint,
                items: [labels.supported, labels.autoTarget, labels.comparing],
              },
              {
                title: translate("Privacy and security"),
                description: labels.privacy,
                items: [labels.tooManyFiles, labels.unsupported],
              },
              {
                title: translate("Features"),
                description: labels.compressionMode,
                items: [labels.balancedMode, labels.smallestMode, labels.losslessMode],
              },
            ]}
          />
        </div>
      </PageContainer>
    </PageShell>
  );
}
