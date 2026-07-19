"use client";

import { Text } from "@workspace/ui/components/text";
import { useEffect, useState } from "react";

interface MarketSessionIndicatorProps {
  exchange: string;
  labels: {
    afterHours: string;
    closed: string;
    open: string;
    preMarket: string;
  };
}

type MarketSession = "after-hours" | "closed" | "open" | "pre-market";

const supportedUnitedStatesExchanges = ["NASDAQ", "NYSE", "AMEX", "ARCA", "CBOE", "OTC"];
const sessionStyles: Record<MarketSession, string> = {
  "after-hours": "bg-amber-500",
  closed: "bg-muted-foreground/55",
  open: "bg-success",
  "pre-market": "bg-sky-500",
};

export function MarketSessionIndicator({ exchange, labels }: MarketSessionIndicatorProps) {
  const [session, setSession] = useState<MarketSession | null>(null);
  const isSupportedExchange = supportedUnitedStatesExchanges.some(function matchesExchange(name) {
    return exchange.toUpperCase().includes(name);
  });

  useEffect(
    function updateMarketSession() {
      if (!isSupportedExchange) return;
      function refreshSession() {
        setSession(getUnitedStatesMarketSession(new Date()));
      }
      const timeoutId = window.setTimeout(refreshSession, 0);
      const intervalId = window.setInterval(refreshSession, 30_000);
      return function stopSessionUpdates() {
        window.clearTimeout(timeoutId);
        window.clearInterval(intervalId);
      };
    },
    [isSupportedExchange],
  );

  if (!isSupportedExchange) return null;
  const sessionLabel = session
    ? {
        "after-hours": labels.afterHours,
        closed: labels.closed,
        open: labels.open,
        "pre-market": labels.preMarket,
      }[session]
    : labels.closed;

  return (
    <Text
      as="span"
      size="xs"
      tone="muted"
      aria-live="polite"
      className={`inline-flex min-w-[7rem] items-center gap-1.5 whitespace-nowrap ${session ? "opacity-100" : "opacity-0"}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 shrink-0 rounded-full ${session ? sessionStyles[session] : sessionStyles.closed}`}
      />
      {sessionLabel}
    </Text>
  );
}

export function getUnitedStatesMarketSession(date: Date): MarketSession {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const weekday = dateParts.find(function findWeekday(part) {
    return part.type === "weekday";
  })?.value;
  if (weekday === "Sat" || weekday === "Sun") return "closed";
  const hour = Number(
    dateParts.find(function findHour(part) {
      return part.type === "hour";
    })?.value,
  );
  const minute = Number(
    dateParts.find(function findMinute(part) {
      return part.type === "minute";
    })?.value,
  );
  const minutesAfterMidnight = hour * 60 + minute;
  if (minutesAfterMidnight >= 4 * 60 && minutesAfterMidnight < 9 * 60 + 30) return "pre-market";
  if (minutesAfterMidnight >= 9 * 60 + 30 && minutesAfterMidnight < 16 * 60) return "open";
  if (minutesAfterMidnight >= 16 * 60 && minutesAfterMidnight < 20 * 60) return "after-hours";
  return "closed";
}
