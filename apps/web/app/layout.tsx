import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getTranslator } from "../messages/get-translator";
import { getRequestLocale } from "./get-request-locale";
import "@workspace/ui/globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const translate = await getTranslator(locale);
  const title = translate("Hugo Striedinger - Senior Software Engineer");
  const description = translate(
    "Hugo Striedinger is a Colombian-born senior software engineer based in New York, with experience at SpaceX, Twitter Inc., and X Corp.",
  );

  return {
    metadataBase: new URL("https://striedinger.co"),
    title,
    description,
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

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
