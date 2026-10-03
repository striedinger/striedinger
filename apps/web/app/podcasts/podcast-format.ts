const dayMilliseconds = 86_400_000;

function startOfDay(timestamp: number) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Formats a duration the way Podcasts labels episodes, for example "45 min" or "1 hr 5 min". */
export function formatListeningDuration(totalSeconds: number, locale: string) {
  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourFormatter = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "hour",
    unitDisplay: "short",
  });
  const minuteFormatter = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "minute",
    unitDisplay: "short",
  });
  if (hours === 0) return minuteFormatter.format(minutes);
  if (minutes === 0) return hourFormatter.format(hours);
  return `${hourFormatter.format(hours)} ${minuteFormatter.format(minutes)}`;
}

/** Formats a playhead as m:ss or h:mm:ss. */
export function formatPlaybackTime(seconds: number) {
  const roundedSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(roundedSeconds / 3_600);
  const minutes = Math.floor((roundedSeconds % 3_600) / 60);
  const remainingSeconds = String(roundedSeconds % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${remainingSeconds}`
    : `${minutes}:${remainingSeconds}`;
}

/** Formats an episode date: Today, Yesterday, a weekday this week, then a short date. */
export function formatEpisodeDate(publishedAt: string, locale: string, now: number) {
  const timestamp = Date.parse(publishedAt);
  if (!Number.isFinite(timestamp)) return "";
  const dayDifference = Math.round((startOfDay(now) - startOfDay(timestamp)) / dayMilliseconds);
  if (dayDifference <= 1 && dayDifference >= 0) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-dayDifference, "day");
  }
  if (dayDifference > 1 && dayDifference < 7) {
    return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(timestamp);
  }
  const isSameYear = new Date(timestamp).getFullYear() === new Date(now).getFullYear();
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(isSameYear ? {} : { year: "numeric" }),
  }).format(timestamp);
}

export function formatPlaybackRate(rate: number, locale: string) {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(rate)}×`;
}
