import type { PodcastSearchResults } from "./types";

let latestResults: PodcastSearchResults | null = null;

/** Keeps the latest results so the next search can show them while its own results load. */
export function rememberSearchResults(results: PodcastSearchResults) {
  latestResults = results;
}

export function readLatestSearchResults() {
  return latestResults;
}
