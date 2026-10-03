import type { PodcastShow } from "./types";

import { JsonLd } from "../../../components/json-ld";
import { localizePath } from "../../../lib/locale-path";
import { siteUrl } from "../../../lib/seo";
import { getRequestLocale } from "../../get-request-locale";
import { getEpisodeHref, getShowHref, readSlugSegmentId } from "./podcast-route";

interface PodcastStructuredDataProps {
  /** The episode's path segment, when the page is an episode. */
  episodeSegment?: Promise<string>;
  show: Promise<PodcastShow | null>;
}

/** schema.org data for a show or episode page, streamed once the show loads. */
export async function PodcastStructuredData({ episodeSegment, show }: PodcastStructuredDataProps) {
  const [resolvedShow, locale, resolvedEpisodeSegment] = await Promise.all([
    show,
    getRequestLocale(),
    episodeSegment,
  ]);
  if (!resolvedShow) return null;
  const { podcast } = resolvedShow;
  const series = {
    "@type": "PodcastSeries",
    name: podcast.title,
    author: { "@type": "Person", name: podcast.author },
    genre: podcast.genre || undefined,
    image: podcast.artworkUrl,
    url: `${siteUrl}${localizePath(getShowHref(podcast), locale)}`,
    sameAs: podcast.url,
  };
  if (resolvedEpisodeSegment === undefined) {
    return <JsonLd value={{ "@context": "https://schema.org", ...series }} />;
  }
  const episodeId = readSlugSegmentId(resolvedEpisodeSegment);
  const episode = resolvedShow.episodes.find(function matchesRoute(showEpisode) {
    return showEpisode.id === episodeId;
  });
  if (!episode) return null;
  return (
    <JsonLd
      value={{
        "@context": "https://schema.org",
        "@type": "PodcastEpisode",
        name: episode.title,
        description: episode.description.slice(0, 500) || undefined,
        datePublished: episode.publishedAt || undefined,
        timeRequired:
          episode.durationMilliseconds > 0
            ? `PT${Math.round(episode.durationMilliseconds / 60_000)}M`
            : undefined,
        url: `${siteUrl}${localizePath(getEpisodeHref({ podcast, episode }), locale)}`,
        associatedMedia: { "@type": "MediaObject", contentUrl: episode.audioUrl },
        partOfSeries: series,
      }}
    />
  );
}
