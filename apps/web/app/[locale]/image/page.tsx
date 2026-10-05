import type { Metadata } from "next";

import type { ImageOptimizerLabels } from "./types";

import { JsonLd } from "../../../components/json-ld";
import { getOnDeviceAiLabels } from "../../../lib/on-device-ai/get-on-device-ai-labels";
import { createPageMetadata, createWebApplicationStructuredData } from "../../../lib/seo";
import { getImageTranslator } from "../../../messages/image/get-translator";
import { getRequestLocale } from "../../get-request-locale";
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
    closeDescription: translate("Close"),
    copiedAltText: translate("Alt Text Copied"),
    copyAltText: translate("Copy Alt Text"),
    describe: translate("Describe"),
    describeTitle: translate("Description of {name}"),
    renamed: translate("Renamed"),
    renameTo: translate("Rename to “{name}”"),
    addMore: translate("Add more"),
    avif: "AVIF",
    autoFormat: translate("Auto"),
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
    dimensionHint: translate("Resize the longest side, in pixels."),
    download: translate("Download"),
    downloadAll: translate("Download all"),
    dropActive: translate("Drop files to start"),
    dropPrompt: translate("Drop images here"),
    error: translate("Could not optimize"),
    format: translate("Image format"),
    jpeg: "JPEG",
    losslessMode: translate("Lossless"),
    maxDimension: translate("Maximum dimension"),
    originalDimensions: translate("Original"),
    preparing: translate("Preparing file"),
    png: "PNG",
    privacy: translate("Files stay on this device. Processing happens entirely in your browser."),
    quality: translate("Quality"),
    qualityHint: translate("Lower values create smaller files."),
    queue: translate("Files"),
    remove: translate("Remove"),
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
    <>
      <JsonLd value={structuredData} />
      <ImageOptimizer aiLabels={getOnDeviceAiLabels(translate)} labels={labels} locale={locale} />
    </>
  );
}
