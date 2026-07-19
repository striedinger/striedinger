import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Suspense } from "react";

import { RequestLocaleBoundary } from "../components/request-locale-boundary";
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

  return {
    metadataBase: new URL("https://striedinger.co"),
    title: {
      default: title,
      template: `%s | Hugo Striedinger`,
    },
    description,
    authors: [{ name: "Hugo Striedinger", url: "https://striedinger.co" }],
    creator: "Hugo Striedinger",
    publisher: "Hugo Striedinger",
    category: "technology",
    formatDetection: {
      address: false,
      email: false,
      telephone: false,
    },
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      url: "/",
      locale,
      siteName: "Hugo Striedinger",
      title,
      description,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      creator: "@striedinger",
      title,
      description,
      images: ["/opengraph-image"],
    },
    robots: {
      index: true,
      follow: true,
    },
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
