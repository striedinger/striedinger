import { Text } from "@workspace/ui/components/text";
import type { Metadata } from "next";
import { LanguagePicker } from "../../components/language-picker";
import { getJsonTranslator } from "../../messages/json/get-translator";
import { getRequestLocale } from "../get-request-locale";
import { JsonTool } from "./json-tool";
import type { JsonToolLabels } from "./types";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getJsonTranslator(locale);
  const title = translate("JSON Validator and Formatter");
  const description = translate(
    "Validate, format, and explore JSON entirely in your browser. Your data never leaves this device.",
  );

  return {
    title,
    description,
    alternates: { canonical: "/json" },
    openGraph: {
      type: "website",
      url: "/json",
      locale,
      siteName: "Hugo Striedinger",
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      creator: "@striedinger",
      title,
      description,
    },
    robots: { index: true, follow: true },
  };
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
  };

  return (
    <main className="min-h-svh px-6 py-12 font-serif sm:py-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-16">
        <nav className="flex items-center justify-between gap-4" aria-label="Hugo Striedinger">
          <Text as="a" size="sm" tone="muted" className="hover:text-foreground" href="/">
            Hugo Striedinger
          </Text>
          <LanguagePicker locale={locale} label={translate("Select language")} />
        </nav>

        <div className="flex flex-col gap-12">
          <header className="flex max-w-3xl flex-col gap-6">
            <Text as="h1" size="4xl" weight="semibold" className="tracking-tight sm:text-5xl sm:leading-none">
              {labels.title}
            </Text>
            <Text size="lg" tone="muted" className="leading-relaxed">
              {labels.description}
            </Text>
          </header>

          <JsonTool labels={labels} />
        </div>
      </div>
    </main>
  );
}
