"use client";

import { Text } from "@workspace/ui/components/text";
import { useSyncExternalStore } from "react";

import { getDateTimeFormat } from "../../../lib/intl-cache";

function subscribeToNothing() {
  return function unsubscribeFromNothing() {};
}

function getToday() {
  return new Date().toDateString();
}

function getNoDate() {
  return null;
}

/** Today's date under the large title, as iOS Stocks shows it, in the visitor's time zone. */
export function StocksDateline({ locale }: { locale: string }) {
  // The page prerenders, so the date is read in the browser; the line keeps its height until then.
  const today = useSyncExternalStore(subscribeToNothing, getToday, getNoDate);
  return (
    <Text className="h-8.5 px-4 text-ios-title1 font-bold text-ios-secondary-label">
      {today
        ? getDateTimeFormat(locale, { month: "long", day: "numeric" }).format(new Date(today))
        : null}
    </Text>
  );
}
