import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { isLocale, supportedLocales } from "@workspace/i18n";
import { notFound } from "next/navigation";

import { localizePath } from "../../lib/locale-path";
import { createPageMetadata, getOpenGraphLocale, siteName, siteUrl } from "../../lib/seo";
import { getTranslator } from "../../messages/get-translator";
import { getRequestLocale } from "../get-request-locale";
import "@workspace/ui/globals.css";

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    // The page backgrounds, so browser chrome blends with the page.
    { media: "(prefers-color-scheme: light)", color: "#fbf7f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getTranslator(locale);
  const title = translate("Hugo Striedinger - Senior Software Engineer");
  const description = translate(
    "Hugo Striedinger is a Colombian-born senior software engineer based in New York, with experience at SpaceX, Twitter Inc., and X Corp.",
  );
  const localizedHomePath = localizePath("/", locale);
  const socialImagePath =
    localizedHomePath === "/" ? "/opengraph-image" : `${localizedHomePath}/opengraph-image`;
  const verification = createVerificationMetadata();

  return {
    ...createPageMetadata({ title, description, locale, path: "/" }),
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s | Hugo Striedinger`,
    },
    applicationName: "Hugo Striedinger",
    authors: [{ name: "Hugo Striedinger", url: "https://striedinger.co" }],
    creator: "Hugo Striedinger",
    publisher: "Hugo Striedinger",
    category: "technology",
    ...(verification ? { verification } : {}),
    formatDetection: {
      address: false,
      email: false,
      telephone: false,
    },
    openGraph: {
      type: "profile",
      url: localizedHomePath,
      locale: getOpenGraphLocale(locale),
      siteName,
      title,
      description,
      firstName: "Hugo",
      lastName: "Striedinger",
      username: "striedinger",
      images: [
        {
          url: socialImagePath,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
  };
}

function createVerificationMetadata(): Metadata["verification"] | undefined {
  const google = process.env.GOOGLE_SITE_VERIFICATION;
  const bing = process.env.BING_SITE_VERIFICATION;

  if (!google && !bing) {
    return undefined;
  }

  return {
    ...(google ? { google } : {}),
    ...(bing ? { other: { "msvalidate.01": bing } } : {}),
  };
}

interface LocaleRootLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

// Every page is prerendered once per locale. The proxy maps unprefixed URLs to the visitor's
// language, so URLs never need a locale code.
export function generateStaticParams() {
  return supportedLocales.map(function createLocaleParam(locale) {
    return { locale };
  });
}

export default async function LocaleRootLayout({ children, params }: LocaleRootLayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
