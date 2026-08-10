import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Suspense } from "react";

import { RequestLocaleBoundary } from "../components/request-locale-boundary";
import { localizePath } from "../lib/locale-path";
import { createPageMetadata, getOpenGraphLocale, siteName, siteUrl } from "../lib/seo";
import { themeCookieName, themes } from "../lib/themes";
import { getTranslator } from "../messages/get-translator";
import { getRequestLocale } from "./get-request-locale";
import "@workspace/ui/globals.css";

const themeBootstrapScript = `(()=>{const prefix=${JSON.stringify(`${themeCookieName}=`)};const stored=document.cookie.split(";").map(value=>value.trim()).find(value=>value.startsWith(prefix))?.slice(prefix.length);const themes=${JSON.stringify(
  themes.map(function selectThemeId(theme) {
    return theme.id;
  }),
)};document.documentElement.dataset.theme=themes.includes(stored)?stored:"default"})()`;

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

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-theme="default" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body>
        <Suspense fallback={null}>
          <RequestLocaleBoundary />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
