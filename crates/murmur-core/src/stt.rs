//! Speech-to-text with NVIDIA Parakeet TDT 0.6B v3 through sherpa-onnx.
//!
//! Model files (from the sherpa-onnx releases page):
//!   encoder.int8.onnx, decoder.int8.onnx, joiner.int8.onnx, tokens.txt
//!
//! To swap in Whisper later, sherpa-rs also has `whisper::WhisperRecognizer`;
//! keep the same `transcribe` signature and pick based on config.

use crate::audio::TARGET_RATE;
use sherpa_rs::transducer::{TransducerConfig, TransducerRecognizer};
use std::path::Path;

pub struct Stt {
    recognizer: TransducerRecognizer,
}

impl Stt {
    pub fn load(model_dir: &Path, threads: i32) -> anyhow::Result<Self> {
        let f = |name: &str| -> anyhow::Result<String> {
            let p = model_dir.join(name);
            anyhow::ensure!(p.exists(), "Missing speech model file: {}", p.display());
            Ok(p.to_string_lossy().into_owned())
        };
        let config = TransducerConfig {
            encoder: f("encoder.int8.onnx")?,
            decoder: f("decoder.int8.onnx")?,
            joiner: f("joiner.int8.onnx")?,
            tokens: f("tokens.txt")?,
            num_threads: threads,
            sample_rate: TARGET_RATE as i32,
            feature_dim: 128,
            model_type: "nemo_transducer".into(),
            decoding_method: "greedy_search".into(),
            ..Default::default()
        };
        let mut recognizer = TransducerRecognizer::new(config)
            .map_err(|e| anyhow::anyhow!("Failed to load speech model: {e}"))?;

        // Warm up so the first real dictation isn't slow.
        let _ = recognizer.transcribe(TARGET_RATE, &vec![0.0f32; TARGET_RATE as usize / 2]);

        Ok(Self { recognizer })
    }

    pub fn transcribe(&mut self, samples_16k: &[f32]) -> String {
        if samples_16k.is_empty() {
            return String::new();
        }
        self.recognizer.transcribe(TARGET_RATE, samples_16k).trim().to_string()
    }
}
