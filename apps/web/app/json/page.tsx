import type { Metadata } from "next";

import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";

import type { JsonToolLabels } from "./types";

import { JsonLd } from "../../components/json-ld";
import { ToolDetails } from "../../components/tool-details";
import { createPageMetadata, createWebApplicationStructuredData } from "../../lib/seo";
import { getJsonTranslator } from "../../messages/json/get-translator";
import { getRequestLocale } from "../get-request-locale";
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
    <PageShell>
      <JsonLd value={structuredData} />
      <PageContainer>
        <div className="flex flex-col gap-12">
          <PageHeader title={labels.title} description={labels.description} />

          <JsonTool labels={labels} />
          <ToolDetails
            title={translate("About this tool")}
            description={labels.description}
            sections={[
              {
                title: translate("How it works"),
                description: labels.emptyPreview,
                items: [labels.valid, labels.preview, labels.expandAll],
              },
              {
                title: translate("Privacy and security"),
                description: labels.privacy,
                items: [labels.tooLarge, labels.tooComplex],
              },
              {
                title: translate("Features"),
                description: labels.description,
                items: [labels.collapseAll, labels.expandValue, labels.collapseValue],
              },
            ]}
          />
        </div>
      </PageContainer>
    </PageShell>
  );
}
