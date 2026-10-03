const appIdPattern = /^[\w-]{1,64}$/;
const podcastTabs = new Set(["new", "library", "search"]);
const libraryViews = new Set(["shows", "saved", "recent"]);

function readId(url: URL, name: string) {
  const value = url.searchParams.get(name);
  return value && appIdPattern.test(value) ? value : null;
}

/**
 * Podcasts and Notes once kept their screens in query parameters. Links shared from that
 * version map to the path route for the same screen, or null when the URL needs no change.
 */
export function getLegacyAppRedirect(url: URL): URL | null {
  const segments = url.pathname.split("/").filter(Boolean);
  const appName = segments.at(-1);
  if (appName !== "podcasts" && appName !== "notes") return null;
  const basePath = `/${segments.join("/")}`;
  const destination = new URL(url);
  destination.search = "";

  if (appName === "notes") {
    const folderId = readId(url, "folder");
    if (!folderId && !url.searchParams.has("note")) return null;
    const noteId = folderId ? readId(url, "note") : null;
    destination.pathname = [basePath, folderId, noteId].filter(Boolean).join("/");
    return destination;
  }

  const podcastId = readId(url, "podcast");
  const tab = url.searchParams.get("tab");
  if (podcastId) {
    const episodeId = readId(url, "episode");
    destination.pathname = `${basePath}/show/${podcastId}${episodeId ? `/episode/${episodeId}` : ""}`;
    return destination;
  }
  if (tab && podcastTabs.has(tab)) {
    const view = url.searchParams.get("view");
    destination.pathname = `${basePath}/${tab}${tab === "library" && view && libraryViews.has(view) ? `/${view}` : ""}`;
    const query = url.searchParams.get("q");
    const shows = url.searchParams.get("shows");
    if (tab === "search" && query) destination.searchParams.set("q", query);
    if (tab === "new" && shows) destination.searchParams.set("shows", shows);
    return destination;
  }
  const query = url.searchParams.get("q");
  if (query) {
    destination.pathname = `${basePath}/search`;
    destination.searchParams.set("q", query);
    return destination;
  }
  return url.searchParams.has("tab") ? destination : null;
}
