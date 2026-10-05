import type { Metadata } from "next";

import type { SvgEditorLabels } from "./types";

import { JsonLd } from "../../../components/json-ld";
import { getOnDeviceAiLabels } from "../../../lib/on-device-ai/get-on-device-ai-labels";
import { createPageMetadata, createWebApplicationStructuredData } from "../../../lib/seo";
import { getSvgTranslator } from "../../../messages/svg/get-translator";
import { getRequestLocale } from "../../get-request-locale";
import { SvgEditor } from "./svg-editor";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getSvgTranslator(locale);
  const title = translate("SVG Viewer, Editor, and Optimizer");
  const description = translate(
    "Edit SVG code with a live preview, then optimize it or export it as a PNG. Everything stays in your browser.",
  );

  return createPageMetadata({ title, description, locale, path: "/svg" });
}

export default async function SvgPage() {
  const locale = await getRequestLocale();
  const translate = await getSvgTranslator(locale);
  const labels: SvgEditorLabels = {
    aiClose: translate("Close"),
    aiDescribe: translate("Add Title and Description"),
    aiPlaceholder: translate("Describe a change, like “make it blue”"),
    aiSubmit: translate("Apply Change"),
    aiTitle: translate("Edit with On-Device AI"),
    aiUndo: translate("Undo"),
    actions: translate("SVG actions"),
    alreadyOptimized: translate("This SVG is already optimized."),
    background: translate("Background"),
    copied: translate("Copied"),
    copy: translate("Copy"),
    darkBackground: translate("Dark"),
    details: translate("Details"),
    description: translate(
      "Edit SVG code with a live preview, then optimize it or export it as a PNG. Everything stays in your browser.",
    ),
    dimensions: translate("Dimensions"),
    downloadSvg: translate("Download SVG"),
    elements: translate("Elements"),
    emptyPreview: translate("Enter valid SVG code to see a preview."),
    exportFailed: translate("This SVG could not be exported as a PNG."),
    exportPng: translate("Export PNG"),
    fileSize: translate("File size"),
    gridBackground: translate("Grid"),
    inputLabel: translate("SVG code"),
    invalid: translate("Invalid SVG: {error}"),
    lightBackground: translate("Light"),
    notSvg: translate("This document is not an SVG image."),
    open: translate("Open"),
    openFailed: translate("This file could not be opened as an SVG."),
    optimize: translate("Optimize"),
    optimized: translate("Optimized from {before} to {after}."),
    optimizeFailed: translate("This SVG could not be optimized."),
    placeholder: translate("Paste SVG code here"),
    preview: translate("Preview"),
    share: translate("Share"),
    privacy: translate("Your SVG stays in this browser and is never sent to the server."),
    title: translate("SVG Editor"),
    tooLarge: translate("This SVG is too large to edit safely in the browser."),
    valid: translate("Valid SVG"),
  };
  const structuredData = createWebApplicationStructuredData({
    name: labels.title,
    description: labels.description,
    applicationCategory: "DesignApplication",
    browserRequirements: "Requires JavaScript",
    featureList: [labels.preview, labels.optimize, labels.exportPng, labels.privacy],
    locale,
    path: "/svg",
  });

  return (
    <>
      <JsonLd value={structuredData} />
      <SvgEditor aiLabels={getOnDeviceAiLabels(translate)} labels={labels} locale={locale} />
    </>
  );
}
