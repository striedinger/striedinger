import { describe, expect, it } from "vitest";

import { formatEpisodeDate, formatListeningDuration, formatPlaybackTime } from "./podcast-format";

const now = new Date(2026, 9, 3, 12).getTime();

describe("podcast formatting", function () {
  it("formats episode lengths like Podcasts", function () {
    expect(formatListeningDuration(45 * 60, "en")).toBe("45 min");
    expect(formatListeningDuration(65 * 60, "en")).toBe("1 hr 5 min");
    expect(formatListeningDuration(20, "en")).toBe("1 min");
  });

  it("formats the playhead with hours only when needed", function () {
    expect(formatPlaybackTime(75)).toBe("1:15");
    expect(formatPlaybackTime(3_725)).toBe("1:02:05");
    expect(formatPlaybackTime(Number.NaN)).toBe("0:00");
  });

  it("uses relative names for recent episodes and dates for older ones", function () {
    expect(formatEpisodeDate(new Date(2026, 9, 2, 8).toISOString(), "en", now)).toBe("yesterday");
    expect(formatEpisodeDate(new Date(2026, 8, 30, 8).toISOString(), "en", now)).toBe("Wednesday");
    expect(formatEpisodeDate(new Date(2026, 6, 4, 8).toISOString(), "en", now)).toBe("Jul 4");
    expect(formatEpisodeDate(new Date(2025, 6, 4, 8).toISOString(), "en", now)).toBe("Jul 4, 2025");
  });
});
