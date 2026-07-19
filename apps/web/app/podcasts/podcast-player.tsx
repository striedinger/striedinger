"use client";

import { CloseIcon } from "@workspace/icons/close-icon";
import { Button } from "@workspace/ui/components/button";
import { Surface } from "@workspace/ui/components/surface";
import { Text } from "@workspace/ui/components/text";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import type { Podcast, PodcastEpisode, PodcastMessages } from "./types";

interface DocumentPictureInPictureController {
  requestWindow(options?: { height?: number; width?: number }): Promise<Window>;
  window: Window | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPictureController;
  }
}

interface PodcastPlayerProps {
  autoPlay: boolean;
  episode: PodcastEpisode;
  initialPositionSeconds: number;
  messages: PodcastMessages;
  onClose: () => void;
  onFinished: (episodeId: string) => void;
  onProgressChange: (
    podcast: Podcast,
    episode: PodcastEpisode,
    positionSeconds: number,
    durationSeconds: number,
  ) => void;
  podcast: Podcast;
}

export function PodcastPlayer({
  autoPlay,
  episode,
  initialPositionSeconds,
  messages,
  onClose,
  onFinished,
  onProgressChange,
  podcast,
}: PodcastPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const mobilePlayButtonRef = useRef<HTMLButtonElement>(null);
  const mobilePlayIconRef = useRef<HTMLSpanElement>(null);
  const mobileSeekRef = useRef<HTMLInputElement>(null);
  const mobileTimeRef = useRef<HTMLOutputElement>(null);
  const pictureInPictureWindowRef = useRef<Window | null>(null);
  const pictureInPictureCleanupRef = useRef<(() => void) | null>(null);
  const [pictureInPictureSupported, setPictureInPictureSupported] = useState(false);
  const reportLifecycleProgress = useEffectEvent(onProgressChange);
  const playMessage = messages["Play"];
  const pauseMessage = messages["Pause"];

  useEffect(function detectPictureInPictureSupport() {
    queueMicrotask(function showPictureInPictureControl() {
      setPictureInPictureSupported(Boolean(window.documentPictureInPicture));
    });
  }, []);

  useEffect(
    function restorePlaybackPosition() {
      const audio = audioRef.current;
      if (!audio || initialPositionSeconds < 1) return;
      if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
        audio.currentTime = initialPositionSeconds;
      } else {
        audio.load();
      }
    },
    [initialPositionSeconds],
  );

  useEffect(
    function synchronizeMobileSeekControl() {
      const audio = audioRef.current;
      const playButton = mobilePlayButtonRef.current;
      const playIcon = mobilePlayIconRef.current;
      const seek = mobileSeekRef.current;
      const time = mobileTimeRef.current;
      if (!audio || !playButton || !playIcon || !seek || !time) return;
      const activeAudio: HTMLAudioElement = audio;
      const mobilePlayButton: HTMLButtonElement = playButton;
      const mobilePlayIcon: HTMLSpanElement = playIcon;
      const mobileSeek: HTMLInputElement = seek;
      const mobileTime: HTMLOutputElement = time;

      function synchronizeSeekPosition() {
        const duration = Number.isFinite(activeAudio.duration)
          ? activeAudio.duration
          : episode.durationMilliseconds / 1_000;
        const position =
          activeAudio.readyState >= HTMLMediaElement.HAVE_METADATA
            ? activeAudio.currentTime
            : initialPositionSeconds;
        mobileSeek.max = String(Math.max(0, duration));
        mobileSeek.value = String(Math.min(position, Math.max(0, duration)));
        mobileSeek.setAttribute(
          "aria-valuetext",
          `${formatTime(position)} / ${formatTime(duration)}`,
        );
        mobileTime.value = `${formatTime(position)} / ${formatTime(duration)}`;
      }

      function synchronizePlaybackState() {
        const playbackLabel = activeAudio.paused ? playMessage : pauseMessage;
        mobilePlayButton.setAttribute("aria-label", playbackLabel);
        mobilePlayIcon.textContent = activeAudio.paused ? "▶" : "❚❚";
      }

      activeAudio.addEventListener("durationchange", synchronizeSeekPosition);
      activeAudio.addEventListener("loadedmetadata", synchronizeSeekPosition);
      activeAudio.addEventListener("pause", synchronizePlaybackState);
      activeAudio.addEventListener("play", synchronizePlaybackState);
      activeAudio.addEventListener("timeupdate", synchronizeSeekPosition);
      synchronizeSeekPosition();
      synchronizePlaybackState();
      return function stopSynchronizingSeekPosition() {
        activeAudio.removeEventListener("durationchange", synchronizeSeekPosition);
        activeAudio.removeEventListener("loadedmetadata", synchronizeSeekPosition);
        activeAudio.removeEventListener("pause", synchronizePlaybackState);
        activeAudio.removeEventListener("play", synchronizePlaybackState);
        activeAudio.removeEventListener("timeupdate", synchronizeSeekPosition);
      };
    },
    [episode.durationMilliseconds, episode.id, initialPositionSeconds, pauseMessage, playMessage],
  );

  useEffect(
    function persistProgressWhenLeaving() {
      function persistCurrentPosition() {
        const audio = audioRef.current;
        if (!audio) return;
        reportLifecycleProgress(podcast, episode, audio.currentTime, audio.duration);
      }
      function persistWhenHidden() {
        if (document.visibilityState === "hidden") persistCurrentPosition();
      }
      window.addEventListener("pagehide", persistCurrentPosition);
      document.addEventListener("visibilitychange", persistWhenHidden);
      return function persistBeforePlayerUnmounts() {
        window.removeEventListener("pagehide", persistCurrentPosition);
        document.removeEventListener("visibilitychange", persistWhenHidden);
        persistCurrentPosition();
      };
    },
    [episode, podcast],
  );

  useEffect(
    function closePictureInPictureForPreviousEpisode() {
      return function closePictureInPicture() {
        pictureInPictureCleanupRef.current?.();
        pictureInPictureCleanupRef.current = null;
        pictureInPictureWindowRef.current?.close();
        pictureInPictureWindowRef.current = null;
      };
    },
    [episode.id],
  );

  function saveCurrentPosition() {
    const audio = audioRef.current;
    if (!audio) return;
    onProgressChange(podcast, episode, audio.currentTime, audio.duration);
  }

  function closePlayer() {
    const audio = audioRef.current;
    audio?.pause();
    saveCurrentPosition();
    pictureInPictureWindowRef.current?.close();
    onClose();
  }

  async function openPictureInPicture() {
    const controller = window.documentPictureInPicture;
    const audio = audioRef.current;
    if (!controller || !audio) return;
    controller.window?.close();
    const pictureInPictureWindow = await controller.requestWindow({ width: 360, height: 220 });
    const activeAudio = audioRef.current;
    if (!activeAudio) {
      pictureInPictureWindow.close();
      return;
    }
    const pictureInPictureAudio: HTMLAudioElement = activeAudio;
    pictureInPictureWindowRef.current = pictureInPictureWindow;
    const pictureInPictureDocument = pictureInPictureWindow.document;
    pictureInPictureDocument.title = episode.title;
    const style = pictureInPictureDocument.createElement("style");
    style.textContent =
      "*{box-sizing:border-box}body{margin:0;padding:20px;background:#171717;color:#fafafa;font:14px system-ui,sans-serif}main{display:grid;gap:12px}p{margin:0}.show{color:#aaa;font-size:12px}.title{font-size:16px;font-weight:650;line-height:1.3}.controls{display:flex;align-items:center;gap:10px}button{border:0;border-radius:999px;background:#fafafa;color:#171717;padding:8px 14px;font:inherit;font-weight:600;cursor:pointer}button.close{margin-left:auto;background:#333;color:#fafafa}input{width:100%;accent-color:#fafafa}.time{color:#aaa;font-variant-numeric:tabular-nums;font-size:12px}";
    pictureInPictureDocument.head.append(style);
    const player = pictureInPictureDocument.createElement("main");
    const show = pictureInPictureDocument.createElement("p");
    show.className = "show";
    show.textContent = podcast.title;
    const title = pictureInPictureDocument.createElement("p");
    title.className = "title";
    title.textContent = episode.title;
    const seek = pictureInPictureDocument.createElement("input");
    seek.type = "range";
    seek.min = "0";
    seek.step = "1";
    seek.setAttribute("aria-label", episode.title);
    const controls = pictureInPictureDocument.createElement("div");
    controls.className = "controls";
    const playButton = pictureInPictureDocument.createElement("button");
    playButton.type = "button";
    const time = pictureInPictureDocument.createElement("span");
    time.className = "time";
    const closeButton = pictureInPictureDocument.createElement("button");
    closeButton.type = "button";
    closeButton.className = "close";
    closeButton.textContent = messages["Close player"];
    controls.append(playButton, time, closeButton);
    player.append(show, title, seek, controls);
    pictureInPictureDocument.body.replaceChildren(player);

    function synchronizeControls() {
      const duration = Number.isFinite(pictureInPictureAudio.duration)
        ? pictureInPictureAudio.duration
        : 0;
      playButton.textContent = pictureInPictureAudio.paused ? messages["Play"] : messages["Pause"];
      seek.max = String(duration);
      seek.value = String(pictureInPictureAudio.currentTime);
      time.textContent = `${formatTime(pictureInPictureAudio.currentTime)} / ${formatTime(duration)}`;
    }
    function togglePlayback() {
      if (pictureInPictureAudio.paused) void pictureInPictureAudio.play();
      else pictureInPictureAudio.pause();
    }
    function seekPlayback() {
      pictureInPictureAudio.currentTime = Number(seek.value);
    }
    function closeFromPictureInPicture() {
      closePlayer();
      pictureInPictureWindow.close();
    }
    function cleanUpPictureInPicture() {
      pictureInPictureAudio.removeEventListener("play", synchronizeControls);
      pictureInPictureAudio.removeEventListener("pause", synchronizeControls);
      pictureInPictureAudio.removeEventListener("timeupdate", synchronizeControls);
      playButton.removeEventListener("click", togglePlayback);
      seek.removeEventListener("input", seekPlayback);
      closeButton.removeEventListener("click", closeFromPictureInPicture);
      pictureInPictureWindowRef.current = null;
    }
    pictureInPictureAudio.addEventListener("play", synchronizeControls);
    pictureInPictureAudio.addEventListener("pause", synchronizeControls);
    pictureInPictureAudio.addEventListener("timeupdate", synchronizeControls);
    playButton.addEventListener("click", togglePlayback);
    seek.addEventListener("input", seekPlayback);
    closeButton.addEventListener("click", closeFromPictureInPicture);
    pictureInPictureWindow.addEventListener("pagehide", cleanUpPictureInPicture, { once: true });
    pictureInPictureCleanupRef.current = cleanUpPictureInPicture;
    synchronizeControls();
  }

  return (
    <Surface
      as="section"
      className="sticky bottom-4 z-30 flex flex-col gap-3 p-4 shadow-raised sm:flex-row sm:items-center"
      aria-label={`${messages["Now playing"]}: ${episode.title}`}
    >
      <div className="min-w-0 sm:w-64">
        <Text size="xs" weight="bold" className="tracking-wider uppercase">
          {messages["Now playing"]}
        </Text>
        <Text size="sm" weight="semibold" numberOfLines={1}>
          {episode.title}
        </Text>
      </div>
      <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:hidden">
        <Button
          ref={mobilePlayButtonRef}
          type="button"
          size="icon-lg"
          aria-label={autoPlay ? messages["Pause"] : messages["Play"]}
          onClick={function toggleMobilePlayback() {
            const audio = audioRef.current;
            if (!audio) return;
            if (audio.paused) void audio.play();
            else audio.pause();
          }}
        >
          <span ref={mobilePlayIconRef} aria-hidden="true">
            {autoPlay ? "❚❚" : "▶"}
          </span>
        </Button>
        <input
          ref={mobileSeekRef}
          type="range"
          min="0"
          max={Math.max(0, episode.durationMilliseconds / 1_000)}
          step="1"
          defaultValue={initialPositionSeconds}
          aria-label={`${messages["Playback position"]}: ${episode.title}`}
          className="min-h-8 w-full accent-primary"
          onInput={function seekPlayback(event) {
            const audio = audioRef.current;
            const time = mobileTimeRef.current;
            if (!audio) return;
            const duration = Number.isFinite(audio.duration)
              ? audio.duration
              : episode.durationMilliseconds / 1_000;
            audio.currentTime = Number(event.currentTarget.value);
            const formattedProgress = `${formatTime(audio.currentTime)} / ${formatTime(duration)}`;
            event.currentTarget.setAttribute("aria-valuetext", formattedProgress);
            if (time) time.value = formattedProgress;
          }}
        />
        <output ref={mobileTimeRef} className="text-xs text-muted-foreground tabular-nums">
          {formatTime(initialPositionSeconds)} / {formatTime(episode.durationMilliseconds / 1_000)}
        </output>
      </div>
      {/* Publisher feeds do not reliably expose caption files alongside episode audio. */}
      {/* oxlint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        key={episode.id}
        controls
        autoPlay={autoPlay}
        preload={autoPlay || initialPositionSeconds > 0 ? "metadata" : "none"}
        src={episode.audioUrl}
        className="hidden h-10 w-full min-w-0 flex-1 sm:block"
        onLoadedMetadata={function restorePosition(event) {
          if (initialPositionSeconds > 0) event.currentTarget.currentTime = initialPositionSeconds;
        }}
        onPause={saveCurrentPosition}
        onEnded={function finishEpisode() {
          onFinished(episode.id);
        }}
      >
        <a href={episode.audioUrl}>{messages["Download episode"]}</a>
      </audio>
      <div className="flex items-center justify-end gap-1">
        {pictureInPictureSupported ? (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={messages["Open picture in picture"]}
            onClick={function showPictureInPicture() {
              void openPictureInPicture();
            }}
          >
            <span aria-hidden="true">▣</span>
          </Button>
        ) : null}
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={messages["Close player"]}
          onClick={closePlayer}
        >
          <CloseIcon />
        </Button>
      </div>
    </Surface>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const roundedSeconds = Math.floor(seconds);
  const hours = Math.floor(roundedSeconds / 3_600);
  const minutes = Math.floor((roundedSeconds % 3_600) / 60);
  const secondsInMinute = String(roundedSeconds % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${secondsInMinute}`
    : `${minutes}:${secondsInMinute}`;
}
