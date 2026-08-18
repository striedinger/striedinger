import type { Metadata } from "next";

import { PageContainer } from "@workspace/ui/components/page-container";
import { PageHeader } from "@workspace/ui/components/page-header";
import { PageShell } from "@workspace/ui/components/page-shell";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";

import type { BrowserDiagnosticsLabels } from "./types";

import { JsonLd } from "../../components/json-ld";
import { ToolDetails } from "../../components/tool-details";
import { createPageMetadata, createWebApplicationStructuredData } from "../../lib/seo";
import { getJavaScriptTranslator } from "../../messages/javascript/get-translator";
import { getRequestLocale } from "../get-request-locale";
import { JavaScriptDiagnostics } from "./javascript-diagnostics";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getJavaScriptTranslator(locale);
  const title = translate("JavaScript Browser Information");
  const description = translate(
    "Inspect the JavaScript, screen, navigator, media, network, and storage information exposed by your browser.",
  );

  return createPageMetadata({ title, description, locale, path: "/javascript" });
}

export default async function JavaScriptInformationPage() {
  const locale = await getRequestLocale();
  const translate = await getJavaScriptTranslator(locale);
  const title = translate("JavaScript Browser Information");
  const description = translate(
    "Inspect the JavaScript, screen, navigator, media, network, and storage information exposed by your browser.",
  );
  const privacy = translate(
    "Everything shown here is read locally in your browser and is not uploaded or stored.",
  );
  const behavior = translate(
    "Values are collected after the page loads and may change when browser permissions, windows, displays, or network conditions change.",
  );
  const labels: BrowserDiagnosticsLabels = {
    batteryAndNetwork: translate("Battery and Network"),
    clientHints: translate("User-Agent Client Hints"),
    collecting: translate("Collecting browser details…"),
    dateTimeAndInternationalization: translate("Date, Time, and Internationalization"),
    documentAndJavaScript: translate("JavaScript and Document"),
    enabled: translate("Enabled"),
    mediaAndDeviceApis: translate("Media and Device APIs"),
    navigator: translate("Navigator"),
    navigatorProperties: translate("Additional Navigator Properties"),
    notSupported: translate("Not supported"),
    pluginsAndMimeTypes: translate("Plugins and MIME Types"),
    refresh: translate("Refresh details"),
    screenAndWindow: translate("Screen and Window"),
    storageApis: translate("Storage APIs"),
    supported: translate("Supported"),
    unavailable: translate("Unavailable"),
  };
  const structuredData = createWebApplicationStructuredData({
    name: title,
    description,
    applicationCategory: "DeveloperApplication",
    browserRequirements: "Requires JavaScript",
    featureList: [
      labels.documentAndJavaScript,
      labels.screenAndWindow,
      labels.navigator,
      labels.clientHints,
    ],
    locale,
    path: "/javascript",
  });

  return (
    <PageShell>
      <JsonLd value={structuredData} />
      <PageContainer>
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
          <PageHeader title={title} description={description} />

          <JavaScriptDiagnostics labels={labels} />

          <noscript>
            <Surface className="p-6 shadow-none">
              <Text tone="muted">
                {translate("JavaScript is disabled, so browser details cannot be collected.")}
              </Text>
            </Surface>
          </noscript>

          <ToolDetails
            title={translate("About this tool")}
            description={description}
            sections={[
              {
                title: translate("How it works"),
                description: behavior,
                items: [labels.documentAndJavaScript, labels.navigator, labels.clientHints],
              },
              {
                title: translate("Privacy and security"),
                description: privacy,
                items: [labels.storageApis, labels.batteryAndNetwork, labels.mediaAndDeviceApis],
              },
            ]}
          />
        </div>
      </PageContainer>
    </PageShell>
  );
}
