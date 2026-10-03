"use client";

import type { ReactNode } from "react";

import { HouseFillIcon } from "@workspace/icons/house-fill-icon";
import { SearchIcon } from "@workspace/icons/search-icon";
import { SquareGridFillIcon } from "@workspace/icons/square-grid-fill-icon";
import { SquareStackFillIcon } from "@workspace/icons/square-stack-fill-icon";
import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";

import type { PodcastMessages, PodcastTab } from "./types";

import { iosGlassClassName } from "../../components/ios/ios-glass";
import { IosSearchField } from "../../components/ios/ios-search-field";

interface PodcastsTabBarProps {
  activeTab: PodcastTab;
  hasAccessory: boolean;
  isMinimized: boolean;
  messages: PodcastMessages;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSelectTab: (tab: PodcastTab) => void;
  previousTab: Exclude<PodcastTab, "search">;
  searchInput: string;
}

/**
 * The iOS 26 floating tab bar: a glass capsule of tabs with a separate round Search button.
 * Choosing Search collapses the tabs into one round button and turns the bar into a search
 * field. From tablet widths the same element becomes the iPadOS glass sidebar.
 */
export function PodcastsTabBar({
  activeTab,
  hasAccessory,
  isMinimized,
  messages,
  onSearchInputChange,
  onSearchSubmit,
  onSelectTab,
  previousTab,
  searchInput,
}: PodcastsTabBarProps) {
  const isSearching = activeTab === "search";
  const tabs: ReadonlyArray<{ icon: ReactNode; id: Exclude<PodcastTab, "search">; label: string }> =
    [
      { id: "home", label: messages.Home, icon: <HouseFillIcon /> },
      { id: "new", label: messages.New, icon: <SquareGridFillIcon /> },
      { id: "library", label: messages.Library, icon: <SquareStackFillIcon /> },
    ];
  const previousTabDetails = tabs.find(function matchesPreviousTab(tab) {
    return tab.id === previousTab;
  });
  const tabButtonClassName =
    "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] leading-3 font-semibold tracking-[0.1px] text-(--ios-label) outline-none select-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-(--ios-tint) aria-[current=page]:bg-(--ios-glass-lens) aria-[current=page]:text-(--ios-tint) md:flex-none md:flex-row md:justify-start md:gap-3 md:px-3 md:py-2.5 md:text-[17px] md:leading-[22px] md:font-normal md:tracking-[-0.43px] md:aria-[current=page]:bg-(--ios-tint) md:aria-[current=page]:text-white dark:md:aria-[current=page]:text-black motion-reduce:transition-none [&_svg]:size-[24px] md:[&_svg]:size-[21px]";

  return (
    <nav
      aria-label={messages.Podcasts}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-center gap-3 px-4 pb-[max(env(safe-area-inset-bottom),14px)] md:pointer-events-auto md:static md:m-3 md:mt-[max(env(safe-area-inset-top),12px)] md:mr-0 md:w-[280px] md:shrink-0 md:flex-col md:items-stretch md:gap-3 md:rounded-[30px] md:bg-(--ios-glass) md:p-3 md:pb-3 md:shadow-[inset_0_0.5px_0_0.5px_var(--ios-glass-edge),0_8px_30px_var(--ios-glass-shadow)] md:backdrop-blur-[14px] [&>*]:pointer-events-auto"
    >
      <Text
        as="span"
        aria-hidden="true"
        className="hidden px-2 pt-1 text-[28px] leading-[34px] font-bold tracking-[0.36px] text-(--ios-label) md:block"
      >
        {messages.Podcasts}
      </Text>
      {isSearching && previousTabDetails ? (
        <button
          type="button"
          aria-label={previousTabDetails.label}
          className={cn(
            "flex size-[60px] shrink-0 animate-in items-center justify-center rounded-full text-(--ios-label) duration-300 outline-none zoom-in-75 fade-in focus-visible:ring-2 focus-visible:ring-(--ios-tint) active:scale-90 motion-reduce:animate-none md:hidden [&_svg]:size-[24px]",
            iosGlassClassName,
          )}
          onClick={function returnToPreviousTab() {
            onSelectTab(previousTab);
          }}
        >
          {previousTabDetails.icon}
        </button>
      ) : null}
      <IosSearchField
        aria-label={messages.Search}
        placeholder={messages["Shows, Episodes, and More"]}
        cancelLabel={messages.Cancel}
        clearLabel={messages["Clear text"]}
        value={searchInput}
        containerClassName={cn(
          "min-w-0 flex-1 md:flex md:flex-none [&_label]:h-[52px] md:[&_label]:h-11",
          isSearching
            ? "flex animate-in duration-300 fade-in slide-in-from-right-8 motion-reduce:animate-none"
            : "hidden",
        )}
        onFocus={function openSearchTab() {
          if (!isSearching) onSelectTab("search");
        }}
        onValueChange={onSearchInputChange}
        onKeyDown={function submitSearch(event) {
          if (event.key !== "Enter") return;
          onSearchSubmit();
          event.currentTarget.blur();
        }}
      />
      <ul
        className={cn(
          "m-0 h-[62px] min-w-0 flex-1 list-none gap-0.5 rounded-full p-1 md:flex md:h-auto md:flex-none md:flex-col md:rounded-none md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none",
          iosGlassClassName,
          isSearching ? "hidden" : "flex",
          isMinimized && "max-md:flex-none",
        )}
      >
        {tabs.map(function renderTab(tab) {
          const isHiddenWhileMinimized = isMinimized && tab.id !== activeTab;
          return (
            <li
              key={tab.id}
              className={cn(
                "flex min-w-0 flex-1 md:flex-none",
                isHiddenWhileMinimized && "max-md:hidden",
                isMinimized && !isHiddenWhileMinimized && "max-md:w-[54px] max-md:flex-none",
              )}
            >
              <button
                type="button"
                aria-current={tab.id === activeTab ? "page" : undefined}
                className={tabButtonClassName}
                onClick={function selectTab() {
                  onSelectTab(tab.id);
                }}
              >
                {tab.icon}
                <span className={cn("truncate", isMinimized && "max-md:sr-only")}>{tab.label}</span>
              </button>
            </li>
          );
        })}
        <li className="hidden md:flex">
          <button
            type="button"
            aria-current={isSearching ? "page" : undefined}
            className={tabButtonClassName}
            onClick={function selectSearch() {
              onSelectTab("search");
            }}
          >
            <SearchIcon strokeWidth={2.6} />
            <span>{messages.Search}</span>
          </button>
        </li>
      </ul>
      <button
        type="button"
        aria-label={messages.Search}
        className={cn(
          "size-[62px] shrink-0 items-center justify-center rounded-full text-(--ios-label) outline-none focus-visible:ring-2 focus-visible:ring-(--ios-tint) active:scale-90 motion-safe:transition-transform md:hidden",
          iosGlassClassName,
          isSearching || (isMinimized && hasAccessory) ? "hidden" : "flex",
        )}
        onClick={function selectSearch() {
          onSelectTab("search");
        }}
      >
        <SearchIcon className="size-[24px]" strokeWidth={2.6} />
      </button>
    </nav>
  );
}
