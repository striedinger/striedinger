export function getPodcastHref(podcastId: string) {
  return `/podcasts?podcast=${encodeURIComponent(podcastId)}`;
}

export function getPodcastEpisodeHref(podcastId: string, episodeId: string) {
  const parameters = new URLSearchParams({ podcast: podcastId, episode: episodeId });
  return `/podcasts?${parameters}`;
}

export function getPodcastSearchHref(query: string) {
  return `/podcasts?q=${encodeURIComponent(query.trim())}`;
}
