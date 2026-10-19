/// <reference lib="webworker" />

import { AudioSampleSink, BlobSource, Input } from "mediabunny";

import { videoInputFormats } from "./video-input";

export interface WaveformRequest {
  /** How many peaks to return, spread evenly over the video. */
  bucketCount: number;
  duration: number;
  file: File;
}

/** Peaks from 0 to 1, loudest first normalised to 1, or `null` when there is no audio. */
export interface WaveformReply {
  peaks: Float32Array | null;
}

/**
 * Reduces a video's audio to one peak per bucket for the trim bar. Only the first channel is
 * read, which is enough to see speech and silence, and samples are released as soon as they
 * are measured, so memory stays flat however long the video is.
 */
async function measurePeaks({ bucketCount, duration, file }: WaveformRequest) {
  const input = new Input({ formats: videoInputFormats, source: new BlobSource(file) });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track || duration <= 0 || !(await track.canDecode())) return null;
    const peaks = new Float32Array(bucketCount);
    const bucketsPerSecond = bucketCount / duration;
    let channel = new Float32Array(0);
    for await (const sample of new AudioSampleSink(track).samples()) {
      const frames = sample.numberOfFrames;
      if (channel.length < frames) channel = new Float32Array(frames);
      sample.copyTo(channel, { format: "f32-planar", frameCount: frames, planeIndex: 0 });
      const { sampleRate, timestamp } = sample;
      sample.close();
      // A decoded chunk is milliseconds long and usually inside one bucket, so bucket edges are
      // found once per run of frames rather than for every frame.
      let frame = 0;
      while (frame < frames) {
        const bucket = Math.floor((timestamp + frame / sampleRate) * bucketsPerSecond);
        const bucketEnd = Math.ceil(((bucket + 1) / bucketsPerSecond - timestamp) * sampleRate);
        const runEnd = Math.min(frames, Math.max(frame + 1, bucketEnd));
        let level = 0;
        for (let index = frame; index < runEnd; index += 1) {
          const value = channel[index] ?? 0;
          if (value > level) level = value;
          else if (-value > level) level = -value;
        }
        if (bucket >= 0 && bucket < bucketCount && level > (peaks[bucket] ?? 0)) {
          peaks[bucket] = level;
        }
        frame = runEnd;
      }
    }
    let loudest = 0;
    for (const peak of peaks) loudest = Math.max(loudest, peak);
    if (loudest === 0) return peaks;
    for (let bucket = 0; bucket < bucketCount; bucket += 1) {
      peaks[bucket] = (peaks[bucket] ?? 0) / loudest;
    }
    return peaks;
  } finally {
    input.dispose();
  }
}

self.addEventListener("message", function handleRequest(event: MessageEvent<WaveformRequest>) {
  measurePeaks(event.data)
    .catch(function skipWaveform() {
      return null;
    })
    .then(function sendPeaks(peaks) {
      const reply: WaveformReply = { peaks };
      self.postMessage(reply, peaks ? [peaks.buffer] : []);
      return undefined;
    })
    .catch(function ignoreClosedPort() {
      return undefined;
    });
});
