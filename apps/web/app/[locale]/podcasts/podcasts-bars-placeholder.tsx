import type { PodcastMessages } from "./types";

import { PodcastsTabBar } from "./podcasts-tab-bar";

interface PodcastsBarsPlaceholderProps {
  messages: PodcastMessages;
}

function ignoreInput() {}

/**
 * The tab bar as the server renders it for screens whose URL it cannot read ahead of time,
 * such as a show opened from a shared link. It is replaced as soon as the page hydrates.
 */
export function PodcastsBarsPlaceholder({ messages }: PodcastsBarsPlaceholderProps) {
  return (
    <PodcastsTabBar
      activeTab={null}
      hasAccessory={false}
      isMinimized={false}
      previousTab="home"
      messages={messages}
      searchInput=""
      onSearchInputChange={ignoreInput}
      onSearchSubmit={ignoreInput}
      onSelectTab={ignoreInput}
    />
  );
}
