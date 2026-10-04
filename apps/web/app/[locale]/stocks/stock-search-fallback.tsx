import { SearchIcon } from "@workspace/icons/search-icon";
import { cn } from "@workspace/ui/lib/utils";

import type { StocksLabels } from "./types";

import { iosGlassClassName } from "../../../components/ios/ios-glass";

interface StockSearchFallbackProps {
  labels: StocksLabels;
  query: string;
}

/** The search field as it will look, shown while suggestions for a shared query stream in. */
export function StockSearchFallback({ labels, query }: StockSearchFallbackProps) {
  return (
    <div
      role="search"
      aria-busy="true"
      className={cn("relative flex h-11 items-center rounded-full", iosGlassClassName)}
    >
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 size-4.5 text-ios-secondary-label"
        strokeWidth={2.4}
      />
      <input
        aria-label={labels.search}
        disabled
        defaultValue={query}
        placeholder={labels.searchPlaceholder}
        className="size-full min-w-0 rounded-full bg-transparent pr-16 pl-10 text-ios-body text-ios-label outline-none placeholder:text-ios-secondary-label"
      />
    </div>
  );
}
