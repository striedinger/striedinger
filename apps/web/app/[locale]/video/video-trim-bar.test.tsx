import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { VideoTrimBar } from "./video-trim-bar";

const labels = {
  pause: "Pause",
  play: "Play",
  playhead: "Playhead",
  trimEnd: "Trim end",
  trimStart: "Trim start",
};

function renderTrimBar(trim = { end: 10, start: 0 }) {
  const onTrimChange = vi.fn<(trim: { end: number; start: number }) => void>();
  const onSeek = vi.fn<(time: number) => void>();
  render(
    <VideoTrimBar
      currentTime={0}
      duration={10}
      isPlaying={false}
      labels={labels}
      onSeek={onSeek}
      onTogglePlayback={vi.fn<() => void>()}
      onTrimChange={onTrimChange}
      thumbnails={[]}
      trim={trim}
    />,
  );
  return { onSeek, onTrimChange };
}

describe("VideoTrimBar", function () {
  it("moves the start handle with the arrow keys and previews that frame", function () {
    const { onSeek, onTrimChange } = renderTrimBar();
    fireEvent.keyDown(screen.getByRole("slider", { name: "Trim start" }), {
      key: "ArrowRight",
      shiftKey: true,
    });
    expect(onTrimChange).toHaveBeenCalledWith({ end: 10, start: 1 });
    expect(onSeek).toHaveBeenCalledWith(1);
  });

  it("never lets the handles cross", function () {
    const { onTrimChange } = renderTrimBar({ end: 3, start: 2.9 });
    fireEvent.keyDown(screen.getByRole("slider", { name: "Trim start" }), {
      key: "ArrowRight",
      shiftKey: true,
    });
    expect(onTrimChange.mock.calls[0]?.[0].start).toBeCloseTo(2.8);
  });
});
