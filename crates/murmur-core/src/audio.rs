//! Microphone capture.
//!
//! cpal streams aren't `Send` on every platform, so the stream lives on its own
//! thread for the whole app lifetime and we talk to it over a channel.
//! Samples are downmixed to mono and resampled to 16 kHz on stop.

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use crossbeam_channel::{bounded, unbounded, Receiver, Sender};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;

pub const TARGET_RATE: u32 = 16_000;

enum Cmd {
    Start,
    Stop(Sender<Vec<f32>>),
    Cancel,
}

pub struct Recorder {
    tx: Sender<Cmd>,
    /// Live input level 0.0–1.0 (f32 bits), for the overlay's meter. An atomic
    /// rather than a Mutex: it's written from the audio callback and polled 20×/s.
    level: Arc<AtomicU32>,
}

impl Recorder {
    pub fn new() -> anyhow::Result<Self> {
        let (tx, rx) = unbounded::<Cmd>();
        let (ready_tx, ready_rx) = bounded::<anyhow::Result<()>>(1);
        let level = Arc::new(AtomicU32::new(0));
        let level_thread = level.clone();

        thread::Builder::new()
            .name("murmur-audio".into())
            .spawn(move || audio_thread(&rx, &ready_tx, &level_thread))?;

        ready_rx.recv()??;
        Ok(Self { tx, level })
    }

    pub fn start(&self) {
        let _ = self.tx.send(Cmd::Start);
    }

    /// Stops recording and returns 16 kHz mono samples.
    pub fn stop(&self) -> Vec<f32> {
        let (tx, rx) = bounded(1);
        if self.tx.send(Cmd::Stop(tx)).is_err() {
            return Vec::new();
        }
        rx.recv().unwrap_or_default()
    }

    pub fn cancel(&self) {
        let _ = self.tx.send(Cmd::Cancel);
    }

    pub fn level(&self) -> f32 {
        f32::from_bits(self.level.load(Ordering::Relaxed))
    }
}

fn audio_thread(rx: &Receiver<Cmd>, ready: &Sender<anyhow::Result<()>>, level: &Arc<AtomicU32>) {
    let buffer: Arc<Mutex<Vec<f32>>> = Arc::new(Mutex::new(Vec::new()));
    let recording = Arc::new(AtomicBool::new(false));
    let (stream, src_rate) = match open_microphone(&buffer, &recording, level) {
        Ok(opened) => opened,
        Err(error) => {
            let _ = ready.send(Err(error));
            return;
        }
    };
    let _ = ready.send(Ok(()));

    for cmd in rx {
        match cmd {
            Cmd::Start => {
                buffer.lock().unwrap().clear();
                recording.store(true, Ordering::Relaxed);
            }
            Cmd::Stop(reply) => {
                recording.store(false, Ordering::Relaxed);
                level.store(0, Ordering::Relaxed);
                // Resample straight from the buffer, then clear it. Clearing keeps its
                // capacity, so the next recording doesn't reallocate while you talk.
                let mut buf = buffer.lock().unwrap();
                let samples = resample(&buf, src_rate, TARGET_RATE);
                buf.clear();
                drop(buf);
                let _ = reply.send(samples);
            }
            Cmd::Cancel => {
                recording.store(false, Ordering::Relaxed);
                level.store(0, Ordering::Relaxed);
                buffer.lock().unwrap().clear();
            }
        }
    }
    drop(stream);
}

/// Opens the default input device and starts a stream that, while `recording` is set,
/// appends mono samples to `buffer` and publishes their level. Returns the running stream
/// and its sample rate.
fn open_microphone(
    buffer: &Arc<Mutex<Vec<f32>>>,
    recording: &Arc<AtomicBool>,
    level: &Arc<AtomicU32>,
) -> anyhow::Result<(cpal::Stream, u32)> {
    let host = cpal::default_host();
    let device = host
        .default_input_device()
        .ok_or_else(|| anyhow::anyhow!("No microphone found"))?;
    let config = device.default_input_config()?;
    let src_rate = config.sample_rate().0;
    let channels = usize::from(config.channels());
    let channel_count = f32::from(config.channels());
    // A minute of audio up front, so a typical dictation never reallocates mid-recording.
    buffer.lock().unwrap().reserve(src_rate as usize * 60);

    let buf_cb = buffer.clone();
    let rec_cb = recording.clone();
    let level_cb = level.clone();
    let err_fn = |e| eprintln!("[murmur] audio stream error: {e}");

    // Push mono frames into the buffer while recording.
    let on_frames = move |mono: &mut dyn Iterator<Item = f32>| {
        if !rec_cb.load(Ordering::Relaxed) {
            return;
        }
        let mut buf = buf_cb.lock().unwrap();
        let start = buf.len();
        buf.extend(mono);
        let chunk = &buf[start..];
        if !chunk.is_empty() {
            level_cb.store((rms(chunk) * 8.0).min(1.0).to_bits(), Ordering::Relaxed);
        }
    };

    let stream_config = config.config();
    let stream = match config.sample_format() {
        cpal::SampleFormat::F32 => device.build_input_stream(
            &stream_config,
            move |data: &[f32], _| {
                on_frames(
                    &mut data
                        .chunks(channels)
                        .map(|f| f.iter().sum::<f32>() / channel_count),
                );
            },
            err_fn,
            None,
        ),
        cpal::SampleFormat::I16 => device.build_input_stream(
            &stream_config,
            move |data: &[i16], _| {
                on_frames(&mut data.chunks(channels).map(|f| {
                    f.iter()
                        .map(|s| f32::from(*s) / f32::from(i16::MAX))
                        .sum::<f32>()
                        / channel_count
                }));
            },
            err_fn,
            None,
        ),
        other => anyhow::bail!("Unsupported sample format {other:?}"),
    }?;
    // Keep the stream running permanently so recording starts with zero latency.
    // (macOS shows the mic indicator the whole time. To avoid that, call
    // stream.play()/pause() on Start/Stop instead, at the cost of ~100 ms.)
    stream.play()?;
    Ok((stream, src_rate))
}

/// Linear-interpolation resampler. Plenty for speech going down to 16 kHz.
///
/// Positions are exact integer ratios: output sample `i` sits `i * from / to` samples into
/// the input, so long recordings don't drift the way an accumulated float ratio can.
fn resample(input: &[f32], from: u32, to: u32) -> Vec<f32> {
    if from == to || input.is_empty() {
        return input.to_vec();
    }
    let (from, to) = (from as usize, to as usize);
    let out_len = input.len() * to / from;
    (0..out_len)
        .map(|i| {
            let offset = i * from;
            let index = offset / to;
            #[expect(
                clippy::cast_precision_loss,
                reason = "both values are below the sample rate, well inside f32's exact integer range"
            )]
            let fraction = (offset % to) as f32 / to as f32;
            let a = input[index];
            let b = input.get(index + 1).copied().unwrap_or(a);
            a + (b - a) * fraction
        })
        .collect()
}

/// Root mean square of `samples` (must not be empty): their loudness, 0.0 for silence.
fn rms(samples: &[f32]) -> f32 {
    #[expect(
        clippy::cast_precision_loss,
        reason = "an audio callback buffer or analysis window holds far fewer than 2^24 samples, so the count converts exactly"
    )]
    let count = samples.len() as f32;
    (samples.iter().map(|s| s * s).sum::<f32>() / count).sqrt()
}

/// Trims leading/trailing near-silence so the models see less dead air.
pub fn trim_silence(samples: &[f32]) -> &[f32] {
    const WIN: usize = 320; // 20 ms at 16 kHz
    const THRESH: f32 = 0.01;
    let loud = |window: &[f32]| rms(window) > THRESH;
    let first = samples.chunks(WIN).position(loud);
    let last = samples.chunks(WIN).rposition(loud);
    match (first, last) {
        (Some(f), Some(l)) => {
            // keep 200 ms of padding either side
            let start = f.saturating_sub(10) * WIN;
            let end = ((l + 11) * WIN).min(samples.len());
            &samples[start..end]
        }
        _ => &[],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resampling_48k_to_16k_keeps_duration() {
        let one_second = vec![0.25f32; 48_000];
        let out = resample(&one_second, 48_000, TARGET_RATE);
        assert_eq!(out.len(), 16_000);
        assert!(out.iter().all(|s| (s - 0.25).abs() < 1e-6));
    }

    #[test]
    fn resampling_44k1_to_16k_interpolates_between_input_samples() {
        // A ramp stays a ramp: each output sample lands on the line between its neighbours.
        let ramp: Vec<f32> = (0..44_100u16).map(|i| f32::from(i) / 44_100.0).collect();
        let out = resample(&ramp, 44_100, TARGET_RATE);
        assert_eq!(out.len(), 16_000);
        for (i, sample) in out.iter().enumerate().step_by(997) {
            let expected = f32::from(u16::try_from(i).unwrap()) / 16_000.0;
            assert!(
                (sample - expected).abs() < 1e-4,
                "sample {i}: {sample} vs {expected}"
            );
        }
    }

    #[test]
    fn trimming_keeps_speech_with_padding_and_drops_dead_air() {
        // 1 s silence, 0.5 s "speech", 1 s silence at 16 kHz.
        let mut samples = vec![0.0f32; 16_000];
        samples.extend(std::iter::repeat_n(0.3f32, 8_000));
        samples.extend(std::iter::repeat_n(0.0f32, 16_000));

        let trimmed = trim_silence(&samples);
        assert!(trimmed.len() >= 8_000, "speech was cut: {}", trimmed.len());
        assert!(
            trimmed.len() < 8_000 + 2 * 4_000,
            "too much silence kept: {}",
            trimmed.len()
        );
    }

    #[test]
    fn trimming_pure_silence_returns_nothing() {
        assert!(trim_silence(&vec![0.001f32; 16_000]).is_empty());
    }
}
