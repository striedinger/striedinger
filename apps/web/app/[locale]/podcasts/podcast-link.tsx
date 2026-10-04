"use client";

import type { ComponentPropsWithRef } from "react";

import { useRouter } from "next/navigation";
import { useRef } from "react";

import type { Podcast, PodcastQueueItem } from "./types";

import { IosLink } from "../../../components/ios/ios-link";
import { rememberEpisode, rememberPodcast } from "./podcast-catalog";
import { getEpisodeHref, getShowHref } from "./podcast-route";

type PodcastLinkProps = Omit<ComponentPropsWithRef<typeof IosLink>, "href"> &
  ({ item: PodcastQueueItem; podcast?: never } | { item?: never; podcast: Podcast });

type RouterPrefetchOptions = Parameters<ReturnType<typeof useRouter>["prefetch"]>[1];

const fullPrefetch = { kind: "full" } as RouterPrefetchOptions;

/**
 * A link that pushes a show or episode screen. The destination renders its header right away
 * from what the list already knows, and its episodes start loading as soon as a finger
 * touches down or a pointer hovers, so most pushes arrive with content ready.
 */
export function PodcastLink({ item, onClick, podcast, ...props }: PodcastLinkProps) {
  const router = useRouter();
  const hasPrefetchedRef = useRef(false);
  const href = item ? getEpisodeHref(item) : getShowHref(podcast);

  function prefetchDestination() {
    if (hasPrefetchedRef.current) return;
    hasPrefetchedRef.current = true;
    router.prefetch(href, fullPrefetch);
  }

  return (
    <IosLink
      {...props}
      href={href}
      // Shows and episodes render per request, so prefetching every visible link would send
      // a request per row while scrolling; intent (hover, touch, focus) prefetches instead.
      prefetch={false}
      onPointerEnter={prefetchDestination}
      onTouchStart={prefetchDestination}
      onFocus={prefetchDestination}
      onClick={function rememberDestination(event) {
        if (item) rememberEpisode(item);
        else rememberPodcast(podcast);
        onClick?.(event);
      }}
    />
  );
}
