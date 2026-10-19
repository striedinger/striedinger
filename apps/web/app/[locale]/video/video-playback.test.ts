import type { InputAudioTrack, InputVideoTrack } from "mediabunny";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createVideoPlayback } from "./video-playback";

const decoders = vi.hoisted(function createDecoderLog() {
  return {
    audio: { open: 0, peakOpen: 0, starts: [] as number[] },
    video: { open: 0, peakOpen: 0, starts: [] as number[] },
  };
});

/** A decoding stream that counts how many are open at once, as real decoders would be. */
async function* decode(log: typeof decoders.video, start: number) {
  log.open += 1;
  log.peakOpen = Math.max(log.peakOpen, log.open);
  try {
    for (let time = start; time < 10; time += 0.5) {
      yield { buffer: {}, canvas: {}, duration: 0.5, timestamp: time };
    }
  } finally {
    log.open -= 1;
  }
}

vi.mock("mediabunny", function mockMediabunny() {
  return {
    AudioBufferSink: class {
      buffers(start: number) {
        decoders.audio.starts.push(start);
        return decode(decoders.audio, start);
      }
    },
    CanvasSink: class {
      canvases(start: number) {
        decoders.video.starts.push(start);
        return decode(decoders.video, start);
      }
      getCanvas(time: number) {
        return Promise.resolve({ canvas: {}, duration: 0.5, timestamp: time });
      }
    },
  };
});

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  currentTime = 0;
  isClosed = false;
  destination = {};
  constructor() {
    FakeAudioContext.instances.push(this);
  }
  close() {
    this.isClosed = true;
    return Promise.resolve();
  }
  createBufferSource() {
    return { addEventListener() {}, buffer: null, connect() {}, start() {}, stop() {} };
  }
  resume() {
    return Promise.resolve();
  }
}

/** Lets every pending decoder step and close finish. */
function settle() {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

function createPlayback() {
  const canvas = { getContext: () => ({ drawImage() {} }), height: 0, width: 0 };
  return createVideoPlayback({
    audioTrack: {} as InputAudioTrack,
    canvas: canvas as unknown as HTMLCanvasElement,
    duration: 10,
    height: 360,
    onPausedChange: vi.fn<(paused: boolean) => void>(),
    videoTrack: {} as InputVideoTrack,
    width: 640,
  });
}

describe("createVideoPlayback", function () {
  beforeEach(function resetDecoders() {
    for (const log of [decoders.audio, decoders.video]) {
      log.open = 0;
      log.peakOpen = 0;
      log.starts = [];
    }
    FakeAudioContext.instances = [];
    vi.stubGlobal("AudioContext", FakeAudioContext);
    vi.stubGlobal("requestAnimationFrame", vi.fn<() => number>().mockReturnValue(1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn<() => void>());
  });

  afterEach(function restoreGlobals() {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps one decoder per track and resumes only from the last of many quick seeks", async function () {
    const playback = createPlayback();
    playback.play();
    await settle();
    for (let step = 1; step <= 20; step += 1) playback.seek(step * 0.25);
    await settle();

    expect(decoders.video.peakOpen).toBe(1);
    expect(decoders.audio.peakOpen).toBe(1);
    expect(decoders.video.starts).toEqual([0, 5]);
    expect(decoders.audio.starts).toEqual([0, 5]);
    playback.dispose();
  });

  it("holds its position while paused", async function () {
    const playback = createPlayback();
    playback.play();
    await settle();
    const clock = FakeAudioContext.instances.at(-1);
    if (!clock) throw new Error("Playback should create an audio context");
    clock.currentTime += 2;
    expect(playback.currentTime).toBeCloseTo(2);

    playback.pause();
    clock.currentTime += 3;
    expect(playback.paused).toBe(true);
    expect(playback.currentTime).toBeCloseTo(2);
    playback.dispose();
  });

  it("plays each time on a fresh audio context, so a silenced one never lingers", async function () {
    const playback = createPlayback();
    playback.play();
    await settle();
    playback.pause();
    playback.play();
    await settle();

    expect(FakeAudioContext.instances).toHaveLength(2);
    expect(FakeAudioContext.instances[0]?.isClosed).toBe(true);
    expect(FakeAudioContext.instances[1]?.isClosed).toBe(false);
    playback.dispose();
  });
});
