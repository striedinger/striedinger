import type { ReactNode } from "react";

import { isLocale, supportedLocales } from "@workspace/i18n";
import { notFound } from "next/navigation";

interface LocalizedLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return supportedLocales
    .filter(function excludeUnprefixedEnglish(locale) {
      return locale !== "en";
    })
    .map(function createLocaleParam(locale) {
      return { locale };
    });
}

export default async function LocalizedLayout({ children, params }: LocalizedLayoutProps) {
  const { locale } = await params;

  if (!isLocale(locale) || locale === "en") {
    notFound();
  }

  return children;
}
