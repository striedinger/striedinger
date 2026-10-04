import type { ReactNode } from "react";

import { Text } from "@workspace/ui/components/text";

interface PodcastShelfProps {
  children: ReactNode;
  title: string;
}

/** A titled, horizontally scrolling row that snaps item by item, like Podcasts shelves. */
export function PodcastShelf({ children, title }: PodcastShelfProps) {
  return (
    <section aria-label={title} className="flex flex-col gap-2.5">
      <Text as="h2" className="px-4 text-ios-title2 font-bold text-ios-label">
        {title}
      </Text>
      <ul className="m-0 flex snap-x snap-mandatory scroll-px-4 list-none gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </ul>
    </section>
  );
}
