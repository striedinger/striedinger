import type { Metadata } from "next";

import { connection } from "next/server";
import { Suspense } from "react";

import type { ListeningState } from "../../../lib/spotify/parse-listening-state";

import { localizePath } from "../../../lib/locale-path";
import { createPageMetadata, siteUrl } from "../../../lib/seo";
import { getListeningState } from "../../../lib/spotify/listening-state";
import { getListeningTranslator } from "../../../messages/listening/get-translator";
import { getRequestLocale } from "../../get-request-locale";
import { listeningImageSize } from "./listening-image";
import { NowPlayingLoader } from "./now-playing-loader";
import { NowPlayingSkeleton } from "./now-playing-skeleton";

const playerSize = { width: 480, height: 270 };

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const locale = await getRequestLocale();
  const [translate, state] = await Promise.all([
    getListeningTranslator(locale),
    getListeningState(),
  ]);
  const title = translate("What Hugo is listening to");
  const description = translate("See what Hugo Striedinger is playing on Spotify right now.");
  const imageAlt = translate("Press play to see what Hugo is listening to on Spotify");
  const pageMetadata = createPageMetadata({ title, description, locale, path: "/listening" });
  const playerUrl = `${siteUrl}${localizePath("/listening", locale)}`;
  const imageUrl = `${playerUrl}/opengraph-image?track=${getTrackKey(state)}`;

  return {
    ...pageMetadata,
    openGraph: {
      ...pageMetadata.openGraph,
      images: [{ url: imageUrl, ...listeningImageSize, alt: imageAlt }],
    },
    robots: { index: false, follow: true },
    twitter: {
      card: "player",
      creator: "@striedinger",
      title,
      description,
      images: [{ url: imageUrl, alt: imageAlt }],
      players: [],
    },
    other: {
      "twitter:player": playerUrl,
      "twitter:player:width": playerSize.width,
      "twitter:player:height": playerSize.height,
    },
  };
}

export default async function ListeningPage() {
  const locale = await getRequestLocale();
  const translate = await getListeningTranslator(locale);

  return (
    <>
      <h1 className="sr-only">{translate("What Hugo is listening to")}</h1>
      <Suspense fallback={<NowPlayingSkeleton />}>
        <NowPlayingLoader locale={locale} />
      </Suspense>
    </>
  );
}

function getTrackKey(state: ListeningState) {
  const spotifyUrl = state.status === "unavailable" ? "" : (state.track?.spotifyUrl ?? "");
  const trackId = spotifyUrl.split("/").at(-1);
  return trackId === undefined || trackId === "" ? "none" : trackId;
}
