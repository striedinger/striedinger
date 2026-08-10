import type { Locale } from "@workspace/i18n";
import type { Metadata } from "next";

import type { SitePath } from "./locale-path";

import { createLanguageAlternates, localizePath } from "./locale-path";

export const siteName = "Hugo Striedinger";
export const siteUrl = "https://striedinger.co";
export const personId = `${siteUrl}/#person`;
export const websiteId = `${siteUrl}/#website`;

const openGraphLocales: Record<Locale, string> = {
  de: "de_DE",
  en: "en_US",
  es: "es_ES",
  fr: "fr_FR",
  it: "it_IT",
  ja: "ja_JP",
  pt: "pt_BR",
  zh: "zh_CN",
};

interface PageMetadataOptions {
  description: string;
  imagePath?: string;
  locale: Locale;
  path: SitePath;
  title: string;
}

interface WebApplicationStructuredDataOptions {
  applicationCategory: string;
  browserRequirements?: string;
  description: string;
  featureList?: readonly string[];
  locale: Locale;
  name: string;
  path: Exclude<SitePath, "/">;
}

export function createPageMetadata({
  description,
  imagePath,
  locale,
  path,
  title,
}: PageMetadataOptions): Metadata {
  const localizedPath = localizePath(path, locale);
  const socialImagePath =
    imagePath ?? (localizedPath === "/" ? "/opengraph-image" : `${localizedPath}/opengraph-image`);

  return {
    title,
    description,
    alternates: {
      canonical: localizedPath,
      languages: createLanguageAlternates(path),
    },
    openGraph: {
      type: "website",
      url: localizedPath,
      locale: openGraphLocales[locale],
      siteName,
      title,
      description,
      images: [{ url: socialImagePath, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      creator: "@striedinger",
      title,
      description,
      images: [{ url: socialImagePath, alt: title }],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export function getOpenGraphLocale(locale: Locale) {
  return openGraphLocales[locale];
}

export function createWebApplicationStructuredData({
  applicationCategory,
  browserRequirements,
  description,
  featureList,
  locale,
  name,
  path,
}: WebApplicationStructuredDataOptions) {
  const localizedPath = localizePath(path, locale);
  const localizedHomePath = localizePath("/", locale);
  const url = `${siteUrl}${localizedPath}`;
  const homeUrl = localizedHomePath === "/" ? siteUrl : `${siteUrl}${localizedHomePath}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${url}#application`,
        url,
        name,
        description,
        applicationCategory,
        operatingSystem: "Any",
        ...(browserRequirements ? { browserRequirements } : {}),
        ...(featureList ? { featureList } : {}),
        inLanguage: locale,
        isAccessibleForFree: true,
        creator: { "@id": personId },
        isPartOf: { "@id": websiteId },
        offers: {
          "@type": "Offer",
          price: 0,
          priceCurrency: "USD",
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: siteName,
            item: homeUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name,
            item: url,
          },
        ],
      },
    ],
  };
}
