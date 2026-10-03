import { Input } from "@workspace/ui/components/input";
import { Text } from "@workspace/ui/components/text";

import type { StocksLabels } from "./types";

interface StockSearchFallbackProps {
  labels: StocksLabels;
  query: string;
}

/** The search box as it will look, shown while suggestions for a shared query stream in. */
export function StockSearchFallback({ labels, query }: StockSearchFallbackProps) {
  return (
    <div role="search" aria-busy="true">
      <Input
        aria-label={labels.search}
        disabled
        defaultValue={query}
        placeholder={labels.searchPlaceholder}
        className="h-11 rounded-xl pr-18 pl-9"
      />
      <Text size="xs" tone="muted" className="px-1 pt-2">
        {labels.searchHelp}
      </Text>
    </div>
  );
}
