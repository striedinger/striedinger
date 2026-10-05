import type { InputAudioTrack, InputVideoTrack, WrappedCanvas } from "mediabunny";

import { AudioBufferSink, CanvasSink } from "mediabunny";

/** The longest edge previews decode at; phones show the preview far smaller than 4K. */
const previewLongEdge = 1280;
/** How far ahead of the playhead audio is decoded and scheduled, in seconds. */
const audioLookahead = 1;

export interface VideoPlayback {
  readonly currentTime: number;
  readonly paused: boolean;
  dispose: () => void;
  pause: () => void;
  /** Starts playback. Call it from a tap so the browser lets audio start. */
  play: () => void;
  seek: (time: number) => void;
}

interface VideoPlaybackOptions {
  audioTrack: InputAudioTrack | null;
  canvas: HTMLCanvasElement;
  duration: number;
  height: number;
  onPausedChange: (paused: boolean) => void;
  videoTrack: InputVideoTrack;
  width: number;
}

/**
 * Plays a video by decoding it with WebCodecs, drawing frames onto a canvas and scheduling audio
 * through Web Audio, whose clock drives the picture. This is the same decoder that renders the
 * filmstrip and exports, so whatever the editor can open it can preview, including on iOS
 * Safari, whose video element stalls on files chosen from the photo library.
 */
export function createVideoPlayback({
  audioTrack,
  canvas,
  duration,
  height,
  onPausedChange,
  videoTrack,
  width,
}: VideoPlaybackOptions): VideoPlayback {
  const scale = Math.min(1, previewLongEdge / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  const videoSink = new CanvasSink(videoTrack, {
    fit: "fill",
    height: canvas.height,
    poolSize: 2,
    width: canvas.width,
  });
  const audioSink = audioTrack ? new AudioBufferSink(audioTrack) : null;
  const scheduledAudio = new Set<AudioBufferSourceNode>();

  let audioContext: AudioContext | null = null;
  let isPlaying = false;
  /** The media time playback started from, or the paused position. */
  let startTime = 0;
  /** The audio clock's time when playback started. */
  let contextStartTime = 0;
  /** Bumped on every play, pause, and seek so stale decoding loops stop. */
  let generation = 0;
  let animationFrame = 0;
  let nextFrame: WrappedCanvas | null = null;
  let videoFrames: AsyncGenerator<WrappedCanvas> | null = null;
  let isFetchingStill = false;
  let pendingStillTime: number | null = null;

  function getTime() {
    if (!isPlaying || !audioContext) return startTime;
    return Math.min(duration, startTime + audioContext.currentTime - contextStartTime);
  }

  function draw(frame: WrappedCanvas) {
    context?.drawImage(frame.canvas, 0, 0);
  }

  function stopDecoding() {
    generation += 1;
    cancelAnimationFrame(animationFrame);
    nextFrame = null;
    void videoFrames?.return(undefined);
    videoFrames = null;
    for (const node of scheduledAudio) node.stop();
    scheduledAudio.clear();
  }

  async function advanceFrame(run: number): Promise<void> {
    const frames = videoFrames;
    if (!frames || run !== generation) return;
    const result = await frames.next();
    if (run !== generation || result.done) return;
    // Frames that are already late are drawn at once so the picture catches up.
    if (result.value.timestamp <= getTime()) {
      draw(result.value);
      return advanceFrame(run);
    }
    nextFrame = result.value;
  }

  function render() {
    if (!isPlaying) return;
    if (getTime() >= duration) {
      pause();
      return;
    }
    if (nextFrame && nextFrame.timestamp <= getTime()) {
      draw(nextFrame);
      nextFrame = null;
      void advanceFrame(generation);
    }
    animationFrame = requestAnimationFrame(render);
  }

  async function playVideo(run: number) {
    videoFrames = videoSink.canvases(startTime);
    const first = await videoFrames.next();
    if (run !== generation || first.done) return;
    draw(first.value);
    await advanceFrame(run);
  }

  async function playAudio(run: number, clock: AudioContext) {
    if (!audioSink) return;
    const buffers = audioSink.buffers(startTime);
    try {
      for await (const { buffer, duration: bufferDuration, timestamp } of buffers) {
        if (run !== generation) return;
        const startAt = contextStartTime + timestamp - startTime;
        const offset = Math.max(0, clock.currentTime - startAt);
        if (offset < bufferDuration) {
          const node = clock.createBufferSource();
          node.buffer = buffer;
          node.connect(clock.destination);
          node.addEventListener("ended", function forgetNode() {
            scheduledAudio.delete(node);
          });
          node.start(Math.max(startAt, clock.currentTime), offset);
          scheduledAudio.add(node);
        }
        await waitUntilNear(timestamp, run);
      }
    } finally {
      void buffers.return();
    }
  }

  function waitUntilNear(timestamp: number, run: number) {
    return new Promise<void>(function waitForPlayhead(resolve) {
      function check() {
        if (run !== generation || timestamp - getTime() < audioLookahead) resolve();
        else setTimeout(check, 100);
      }
      check();
    });
  }

  async function showStill(time: number) {
    // Scrubbing asks for frames faster than they decode, so only the latest request runs next.
    pendingStillTime = time;
    if (isFetchingStill) return;
    isFetchingStill = true;
    try {
      await drawPendingStill();
    } finally {
      isFetchingStill = false;
    }
  }

  async function drawPendingStill(): Promise<void> {
    if (pendingStillTime === null) return;
    const target = pendingStillTime;
    const run = generation;
    pendingStillTime = null;
    const frame = await videoSink.getCanvas(target);
    if (frame && run === generation && !isPlaying) draw(frame);
    return drawPendingStill();
  }

  function startPlayback() {
    if (!audioContext) return;
    contextStartTime = audioContext.currentTime;
    const run = generation;
    void playVideo(run).catch(ignoreDecodeError);
    void playAudio(run, audioContext).catch(ignoreDecodeError);
    animationFrame = requestAnimationFrame(render);
  }

  function play() {
    if (isPlaying) return;
    // iOS only lets audio start inside a tap, and mutes Web Audio with the ringer unless the page
    // asks for media playback.
    const audioSession = (navigator as { audioSession?: { type: string } }).audioSession;
    if (audioSession) audioSession.type = "playback";
    audioContext ??= new AudioContext();
    void audioContext.resume();
    if (startTime >= duration) startTime = 0;
    stopDecoding();
    isPlaying = true;
    startPlayback();
    onPausedChange(false);
  }

  function pause() {
    if (!isPlaying) return;
    startTime = getTime();
    isPlaying = false;
    stopDecoding();
    onPausedChange(true);
  }

  function seek(time: number) {
    startTime = Math.min(Math.max(0, time), duration);
    stopDecoding();
    if (isPlaying) startPlayback();
    else void showStill(startTime).catch(ignoreDecodeError);
  }

  void showStill(0).catch(ignoreDecodeError);

  return {
    get currentTime() {
      return getTime();
    },
    get paused() {
      return !isPlaying;
    },
    dispose() {
      isPlaying = false;
      stopDecoding();
      void audioContext?.close();
    },
    pause,
    play,
    seek,
  };
}

/** A file the browser cannot decode keeps its last frame, or plays silently. */
function ignoreDecodeError() {
  return undefined;
}
