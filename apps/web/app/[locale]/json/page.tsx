import type { Metadata } from "next";

import type { JsonToolLabels } from "./types";

import { IosToolScreen } from "../../../components/ios/ios-tool-screen";
import { JsonLd } from "../../../components/json-ld";
import { createPageMetadata, createWebApplicationStructuredData } from "../../../lib/seo";
import { getJsonTranslator } from "../../../messages/json/get-translator";
import { getRequestLocale } from "../../get-request-locale";
import { JsonTool } from "./json-tool";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getJsonTranslator(locale);
  const title = translate("JSON Formatter, Validator, and Tree Viewer");
  const description = translate(
    "Validate, format, and explore JSON entirely in your browser. Your data never leaves this device.",
  );

  return createPageMetadata({ title, description, locale, path: "/json" });
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
  const structuredData = createWebApplicationStructuredData({
    name: labels.title,
    description: labels.description,
    applicationCategory: "DeveloperApplication",
    browserRequirements: "Requires JavaScript",
    featureList: [labels.valid, labels.preview, labels.expandAll, labels.privacy],
    locale,
    path: "/json",
  });

  return (
    <IosToolScreen title={labels.title} contentWidth="64rem">
      <JsonLd value={structuredData} />
      <JsonTool labels={labels} />
    </IosToolScreen>
  );
}
