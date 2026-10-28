import type { Locale } from "@workspace/i18n";

import { connection } from "next/server";

import type { ListeningState } from "../../../lib/spotify/parse-listening-state";
import type { NowPlayingLabels } from "./now-playing-card";

import { IosRevealTransition } from "../../../components/ios/ios-reveal-transition";
import { getRelativeTimeFormat } from "../../../lib/intl-cache";
import { getListeningState } from "../../../lib/spotify/listening-state";
import { getListeningTranslator } from "../../../messages/listening/get-translator";
import { ListeningRefresher } from "./listening-refresher";
import { NowPlayingCard } from "./now-playing-card";

type Translate = Awaited<ReturnType<typeof getListeningTranslator>>;

interface NowPlayingLoaderProps {
  locale: Locale;
}

/** Reads Spotify for this request and keeps the reading fresh while the page stays open. */
export async function NowPlayingLoader({ locale }: NowPlayingLoaderProps) {
  await connection();
  const [state, translate] = await Promise.all([
    getListeningState(),
    getListeningTranslator(locale),
  ]);
  // oxlint-disable-next-line react-hooks-js/purity, react/purity -- Server component; runs once per request.
  const now = Date.now();
  // Measured against the server clock that took the reading, so the page never compares it
  // with the viewer's clock.
  const elapsedMs = getElapsedMs(state, now);
  const labels: NowPlayingLabels = {
    title: translate("What Hugo is listening to"),
    nothingPlaying: translate("Nothing playing"),
    checkBack: translate("Check back in a bit"),
    openInSpotify: translate("Open in Spotify"),
    openSpotify: translate("Open Spotify"),
    cover: translate("{album} cover"),
    playbackPosition: translate("Playback position"),
    progressValue: translate("{elapsed} of {total}"),
  };

  return (
    <IosRevealTransition className="size-full">
      <NowPlayingCard
        elapsedMs={elapsedMs}
        labels={labels}
        state={state}
        statusLabel={describeStatus(state, now, locale, translate)}
      />
      <ListeningRefresher
        msUntilTrackEnds={
          state.status === "playing" ? state.track.durationMs - (elapsedMs ?? 0) : null
        }
      />
    </IosRevealTransition>
  );
}

function getElapsedMs(state: ListeningState, now: number) {
  if (state.status === "paused") return state.progressMs;
  if (state.status !== "playing") return null;
  return Math.min(state.track.durationMs, state.progressMs + Math.max(0, now - state.observedAt));
}

function describeStatus(state: ListeningState, now: number, locale: Locale, translate: Translate) {
  if (state.status === "playing") return translate("Listening now");
  if (state.status === "paused") return translate("Paused");
  if (state.status === "idle" && state.track) {
    return state.playedAt
      ? translate("Last played {time}").replace(
          "{time}",
          formatTimeAgo(Date.parse(state.playedAt), now, locale),
        )
      : translate("Recently played");
  }
  return translate("Not listening right now");
}

const timeUnits = [
  { unit: "day", milliseconds: 86_400_000 },
  { unit: "hour", milliseconds: 3_600_000 },
] as const;
const minuteMilliseconds = 60_000;

function formatTimeAgo(timestamp: number, now: number, locale: Locale) {
  const elapsed = Math.max(0, now - timestamp);
  const format = getRelativeTimeFormat(locale, { numeric: "auto", style: "long" });
  for (const { unit, milliseconds } of timeUnits) {
    if (elapsed >= milliseconds) return format.format(-Math.floor(elapsed / milliseconds), unit);
  }
  // A song that ended moments ago still reads as a minute ago, not "now".
  return format.format(-Math.max(1, Math.floor(elapsed / minuteMilliseconds)), "minute");
}
