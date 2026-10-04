import type { Metadata } from "next";

import { Text } from "@workspace/ui/components/text";

import type { BrowserDiagnosticsLabels } from "./types";

import { IosToolScreen } from "../../../components/ios/ios-tool-screen";
import { JsonLd } from "../../../components/json-ld";
import { createPageMetadata, createWebApplicationStructuredData } from "../../../lib/seo";
import { getJavaScriptTranslator } from "../../../messages/javascript/get-translator";
import { getRequestLocale } from "../../get-request-locale";
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
    privacy: translate(
      "Everything shown here is read locally in your browser and is not uploaded or stored.",
    ),
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
    <>
      <JsonLd value={structuredData} />
      <IosToolScreen title={title}>
        <JavaScriptDiagnostics labels={labels} />

        <noscript>
          <Text className="rounded-[22px] bg-(--ios-grouped-cell) px-4 py-3 text-[17px] leading-[22px] tracking-[-0.43px] text-(--ios-label)">
            {translate("JavaScript is disabled, so browser details cannot be collected.")}
          </Text>
        </noscript>
      </IosToolScreen>
    </>
  );
}
