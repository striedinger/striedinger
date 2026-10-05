import type { Metadata } from "next";

import type { PdfToolLabels } from "./types";

import { JsonLd } from "../../../components/json-ld";
import { getOnDeviceAiLabels } from "../../../lib/on-device-ai/get-on-device-ai-labels";
import { createPageMetadata, createWebApplicationStructuredData } from "../../../lib/seo";
import { getPdfTranslator } from "../../../messages/pdf/get-translator";
import { getRequestLocale } from "../../get-request-locale";
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
    closeSummary: translate("Close"),
    copySummary: translate("Copy Summary"),
    noText: translate("This PDF has no text to summarize, such as a scanned document."),
    summarize: translate("Summarize Document"),
    summaryCopied: translate("Summary Copied"),
    summaryTitle: translate("Key Points"),
    sameLanguage: translate("This document is already in your language."),
    translate: translate("Translate Document"),
    translatedFrom: translate("Translated from {language}"),
    translation: translate("Translation"),
    translationCopied: translate("Translation Copied"),
    copyTranslation: translate("Copy Translation"),
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
    quality: translate("Quality"),
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
    <>
      <JsonLd value={structuredData} />
      <PdfTool aiLabels={getOnDeviceAiLabels(translate)} labels={labels} locale={locale} />
    </>
  );
}
