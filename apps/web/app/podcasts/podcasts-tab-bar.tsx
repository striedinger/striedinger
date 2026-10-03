"use client";

import type { ReactNode } from "react";

import { HouseFillIcon } from "@workspace/icons/house-fill-icon";
import { SearchIcon } from "@workspace/icons/search-icon";
import { SquareGridFillIcon } from "@workspace/icons/square-grid-fill-icon";
import { SquareStackFillIcon } from "@workspace/icons/square-stack-fill-icon";
import { Text } from "@workspace/ui/components/text";

import type { PodcastMessages, PodcastTab } from "./types";

interface PodcastsTabBarProps {
  activeTab: PodcastTab;
  messages: PodcastMessages;
  onSelectTab: (tab: PodcastTab) => void;
}

/**
 * The bottom tab bar on phones. From tablet widths the same element becomes the iPadOS
 * sidebar, so there is a single navigation tree for every screen size.
 */
export function PodcastsTabBar({ activeTab, messages, onSelectTab }: PodcastsTabBarProps) {
  const tabs: ReadonlyArray<{ icon: ReactNode; id: PodcastTab; label: string }> = [
    { id: "home", label: messages.Home, icon: <HouseFillIcon /> },
    { id: "browse", label: messages.Browse, icon: <SquareGridFillIcon /> },
    { id: "library", label: messages.Library, icon: <SquareStackFillIcon /> },
    { id: "search", label: messages.Search, icon: <SearchIcon strokeWidth={2.6} /> },
  ];

  return (
    <nav
      aria-label={messages.Podcasts}
      className="absolute inset-x-0 bottom-0 z-30 bg-(--ios-chrome) pb-[env(safe-area-inset-bottom)] shadow-[0_-0.5px_0_var(--ios-separator)] backdrop-blur-xl backdrop-saturate-180 md:static md:flex md:w-[260px] md:shrink-0 md:flex-col md:gap-2 md:bg-(--ios-secondary-background) md:px-3 md:pt-4 md:pb-4 md:shadow-[0.5px_0_0_var(--ios-separator)] md:backdrop-blur-none lg:w-[280px]"
    >
      <Text
        as="span"
        aria-hidden="true"
        className="hidden px-3 pb-2 text-[28px] leading-[34px] font-bold tracking-[0.36px] text-(--ios-label) md:block"
      >
        {messages.Podcasts}
      </Text>
      <ul className="m-0 grid h-[49px] list-none grid-cols-4 p-0 md:flex md:h-auto md:flex-col md:gap-0.5">
        {tabs.map(function renderTab(tab) {
          const isActive = tab.id === activeTab;
          return (
            <li key={tab.id} className="flex">
              <button
                type="button"
                aria-current={isActive ? "page" : undefined}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 pt-1 text-[10px] leading-3 font-medium tracking-[0.1px] text-(--ios-gray) outline-none select-none focus-visible:text-(--ios-label) aria-[current=page]:text-(--ios-tint) md:flex-row md:justify-start md:gap-3 md:rounded-[10px] md:px-3 md:py-2 md:text-[17px] md:leading-[22px] md:font-normal md:tracking-[-0.43px] md:text-(--ios-label) md:hover:bg-(--ios-fill)/60 md:aria-[current=page]:bg-(--ios-tint) md:aria-[current=page]:text-white [&_svg]:size-[25px] md:[&_svg]:size-[22px] md:[&_svg]:text-(--ios-tint) md:aria-[current=page]:[&_svg]:text-white"
                onClick={function selectTab() {
                  onSelectTab(tab.id);
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
