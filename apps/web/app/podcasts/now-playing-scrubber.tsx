"use client";

import { Text } from "@workspace/ui/components/text";
import { cn } from "@workspace/ui/lib/utils";
import { useState } from "react";

import type { PodcastMessages } from "./types";

import { formatPlaybackTime } from "./podcast-format";
import { seekTo, usePlaybackTime } from "./podcast-player-store";
import { PodcastSlider } from "./podcast-slider";

interface NowPlayingScrubberProps {
  duration: number;
  messages: PodcastMessages;
}

export function NowPlayingScrubber({ duration, messages }: NowPlayingScrubberProps) {
  const playbackTime = usePlaybackTime();
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const displayedTime = scrubTime ?? playbackTime;
  const remainingTime = Math.max(0, duration - displayedTime);
  const valueText = `${formatPlaybackTime(displayedTime)} / ${formatPlaybackTime(duration)}`;

  return (
    <div className="flex flex-col gap-1">
      <PodcastSlider
        label={messages["Playback position"]}
        max={duration}
        value={playbackTime}
        valueText={valueText}
        keyboardStep={15}
        onDragChange={setScrubTime}
        onCommit={seekTo}
      />
      <div
        className={cn(
          "flex justify-between text-[12px] leading-4 font-medium text-white/55 tabular-nums transition-colors duration-200",
          scrubTime !== null && "text-white/90",
        )}
      >
        <Text as="span" className="text-inherit">
          {formatPlaybackTime(displayedTime)}
        </Text>
        <Text as="span" className="text-inherit">
          -{formatPlaybackTime(remainingTime)}
        </Text>
      </div>
    </div>
  );
}
