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

function renderTrimBar(trim = { end: 10, start: 0 }, keyframes: readonly number[] | null = null) {
  const onTrimChange = vi.fn<(trim: { end: number; start: number }) => void>();
  const onSeek = vi.fn<(time: number) => void>();
  render(
    <VideoTrimBar
      currentTime={0}
      duration={10}
      isPlaying={false}
      keyframes={keyframes}
      labels={labels}
      onSeek={onSeek}
      onTogglePlayback={vi.fn<() => void>()}
      onTrimChange={onTrimChange}
      thumbnails={[]}
      trim={trim}
      waveform={null}
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

  it("moves a lossless start a keyframe at a time", function () {
    const { onSeek, onTrimChange } = renderTrimBar({ end: 10, start: 2 }, [0, 2, 4.5, 9.9]);
    const startHandle = screen.getByRole("slider", { name: "Trim start" });
    fireEvent.keyDown(startHandle, { key: "ArrowRight" });
    expect(onTrimChange).toHaveBeenLastCalledWith({ end: 10, start: 4.5 });
    expect(onSeek).toHaveBeenLastCalledWith(4.5);
  });
});
