//! Murmur core: everything that isn't platform UI.
//!
//! The native shells (Swift on macOS now; C#/GTK later) call into this through
//! UniFFI-generated bindings. All calls are blocking, so shells should call
//! `stop_and_process` / `rewrite` off the main thread.

uniffi::setup_scaffolding!();

mod audio;
mod config;
mod history;
mod llm;
mod stt;

use config::Config;
use history::History;
pub use history::HistoryItem;
use std::path::PathBuf;
use std::sync::{Arc, Mutex, RwLock};
use std::time::Instant;

#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum MurmurError {
    #[error("{msg}")]
    Setup { msg: String },
    #[error("{msg}")]
    Processing { msg: String },
}

impl MurmurError {
    fn setup(e: impl std::fmt::Display) -> Self {
        Self::Setup { msg: e.to_string() }
    }
    fn processing(e: impl std::fmt::Display) -> Self {
        Self::Processing { msg: e.to_string() }
    }
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct DictationResult {
    /// What the speech model heard.
    pub raw: String,
    /// What to paste (equals `raw` for modes without the LLM).
    pub output: String,
    pub mode: String,
    pub stt_ms: u64,
    pub llm_ms: u64,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct ModeInfo {
    pub id: String,
    pub name: String,
    pub uses_llm: bool,
}

#[derive(uniffi::Object)]
pub struct Engine {
    dir: PathBuf,
    config: RwLock<Config>,
    /// None when no microphone could be opened. Dictation then hears silence, and
    /// `process_audio` still works (tests, files).
    recorder: Option<audio::Recorder>,
    stt: Mutex<stt::Stt>,
    llm: Option<llm::Llm>,
    history: History,
}

#[uniffi::export]
impl Engine {
    /// Loads config and both models. Slow (a few seconds): call off the main thread.
    #[uniffi::constructor]
    pub fn new(data_dir: String) -> Result<Arc<Self>, MurmurError> {
        let dir = PathBuf::from(data_dir);
        let config = Config::load_or_create(&dir).map_err(MurmurError::setup)?;

        // Load both models at once. They're independent and each takes seconds, so
        // startup time is the slower of the two instead of their sum.
        let (stt, llm) = std::thread::scope(|scope| {
            let llm_loader = scope.spawn(|| load_llm(&dir, &config));
            let stt = stt::Stt::load(
                &Config::resolve(&dir, &config.stt.model_dir),
                config.stt.threads,
            );
            (
                stt,
                llm_loader
                    .join()
                    .unwrap_or_else(|_| Err(anyhow::anyhow!("LLM loader panicked"))),
            )
        });
        let stt = stt.map_err(MurmurError::setup)?;
        let llm = llm.map_err(MurmurError::setup)?;
        let recorder = audio::Recorder::new()
            .inspect_err(|error| eprintln!("[murmur] microphone unavailable: {error}"))
            .ok();
        let history = History::open(&dir.join("history.sqlite")).map_err(MurmurError::setup)?;

        Ok(Arc::new(Self {
            dir,
            config: RwLock::new(config),
            recorder,
            stt: Mutex::new(stt),
            llm,
            history,
        }))
    }

    pub fn start_recording(&self) {
        if let Some(recorder) = &self.recorder {
            recorder.start();
        }
    }

    pub fn cancel_recording(&self) {
        if let Some(recorder) = &self.recorder {
            recorder.cancel();
        }
    }

    /// 0.0–1.0, poll ~20×/s for a level meter.
    pub fn input_level(&self) -> f32 {
        self.recorder.as_ref().map_or(0.0, audio::Recorder::level)
    }

    pub fn microphone_available(&self) -> bool {
        self.recorder.is_some()
    }

    /// Stops recording, transcribes, and runs the mode's cleanup.
    /// `app` is the frontmost app's id, used for per-app tone.
    pub fn stop_and_process(
        &self,
        mode_id: Option<String>,
        app: Option<String>,
    ) -> Result<DictationResult, MurmurError> {
        self.process_audio(self.stop_recorder(), mode_id, app)
    }

    /// Transcribes and cleans up 16 kHz mono audio that didn't come from the microphone,
    /// such as a file or a test sample.
    pub fn process_audio(
        &self,
        samples: Vec<f32>,
        mode_id: Option<String>,
        app: Option<String>,
    ) -> Result<DictationResult, MurmurError> {
        let speech = audio::trim_silence(&samples);

        let mode_id = mode_id.unwrap_or_else(|| self.config.read().unwrap().default_mode.clone());
        if speech.len() < (audio::TARGET_RATE as usize / 5) {
            return Ok(DictationResult {
                raw: String::new(),
                output: String::new(),
                mode: mode_id,
                stt_ms: 0,
                llm_ms: 0,
            });
        }

        let t = Instant::now();
        let raw = self.stt.lock().unwrap().transcribe(speech);
        let stt_ms = t.elapsed().as_millis() as u64;

        let t = Instant::now();
        let output = self.apply_mode(&raw, &mode_id, app.as_deref())?;
        let llm_ms = t.elapsed().as_millis() as u64;

        if !raw.is_empty() {
            if let Err(e) = self.history.add(app.as_deref(), &mode_id, &raw, &output) {
                eprintln!("[murmur] history write failed: {e}");
            }
        }
        Ok(DictationResult {
            raw,
            output,
            mode: mode_id,
            stt_ms,
            llm_ms,
        })
    }

    /// Runs a mode over existing text (e.g. the user's selection).
    pub fn rewrite(
        &self,
        text: String,
        mode_id: String,
        app: Option<String>,
    ) -> Result<String, MurmurError> {
        self.apply_mode(&text, &mode_id, app.as_deref())
    }

    /// Spoken command over selected text: "make this shorter", "translate to Spanish".
    pub fn command(&self, selection: String, app: Option<String>) -> Result<String, MurmurError> {
        let samples = self.stop_recorder();
        let spoken = self
            .stt
            .lock()
            .unwrap()
            .transcribe(audio::trim_silence(&samples));
        if spoken.is_empty() {
            return Ok(selection);
        }
        let Some(llm) = &self.llm else {
            return Ok(selection);
        };
        let (tone, vocabulary) = {
            let cfg = self.config.read().unwrap();
            (
                cfg.tone_for(app.as_deref()).map(str::to_string),
                cfg.vocabulary.clone(),
            )
        };
        let instruction = format!(
            "The transcript is the user's selected text. Apply this edit request to it and return \
             only the edited text: {spoken}"
        );
        llm.process(&selection, &instruction, tone.as_deref(), &vocabulary)
            .map_err(MurmurError::processing)
    }

    pub fn modes(&self) -> Vec<ModeInfo> {
        self.config
            .read()
            .unwrap()
            .modes
            .iter()
            .map(|m| ModeInfo {
                id: m.id.clone(),
                name: m.name.clone(),
                uses_llm: m.use_llm,
            })
            .collect()
    }

    pub fn default_mode(&self) -> String {
        self.config.read().unwrap().default_mode.clone()
    }

    pub fn llm_available(&self) -> bool {
        self.llm.is_some()
    }

    pub fn recent_history(&self, limit: u32) -> Vec<HistoryItem> {
        self.history.recent(limit).unwrap_or_default()
    }

    pub fn config_path(&self) -> String {
        self.dir.join("config.toml").to_string_lossy().into_owned()
    }

    /// Re-reads modes, vocabulary and app rules. Model path changes need a restart.
    pub fn reload_config(&self) -> Result<(), MurmurError> {
        let cfg = Config::load_or_create(&self.dir).map_err(MurmurError::setup)?;
        *self.config.write().unwrap() = cfg;
        Ok(())
    }
}

/// Loads the cleanup model and runs one throwaway request in the default mode. That
/// compiles the GPU kernels and fills the prompt cache with the system prompt, so the
/// first real dictation is as fast as later ones.
fn load_llm(dir: &std::path::Path, config: &Config) -> anyhow::Result<Option<llm::Llm>> {
    if !config.llm.enabled {
        return Ok(None);
    }
    let llm = llm::Llm::load(
        &Config::resolve(dir, &config.llm.model_path),
        config.llm.gpu_layers,
        config.llm.context_size,
        config.llm.max_tokens,
    )?;
    if let Some(mode) = config
        .mode(&config.default_mode)
        .filter(|mode| mode.use_llm)
    {
        llm.process("Hello there.", &mode.instruction, None, &config.vocabulary)?;
    }
    Ok(Some(llm))
}

/// What one LLM request needs from the settings. It's copied out so the config lock
/// isn't held for the seconds the model runs, which would stall a settings reload.
struct ModeRequest {
    instruction: String,
    tone: Option<String>,
    vocabulary: Vec<String>,
}

impl Engine {
    fn stop_recorder(&self) -> Vec<f32> {
        self.recorder
            .as_ref()
            .map(audio::Recorder::stop)
            .unwrap_or_default()
    }

    fn apply_mode(
        &self,
        text: &str,
        mode_id: &str,
        app: Option<&str>,
    ) -> Result<String, MurmurError> {
        let (llm, request) = {
            let cfg = self.config.read().unwrap();
            let mode = cfg
                .mode(mode_id)
                .ok_or_else(|| MurmurError::processing(format!("Unknown mode '{mode_id}'")))?;
            if !mode.use_llm {
                return Ok(text.trim().to_string());
            }
            let words = text.split_whitespace().count();
            let too_short = words == 0 || (mode_id == "clean" && words < cfg.llm.skip_below_words);
            let Some(llm) = self.llm.as_ref().filter(|_| !too_short) else {
                return Ok(basic_cleanup(text));
            };
            let request = ModeRequest {
                instruction: mode.instruction.clone(),
                tone: cfg.tone_for(app).map(str::to_string),
                vocabulary: cfg.vocabulary.clone(),
            };
            (llm, request)
        };
        llm.process(
            text,
            &request.instruction,
            request.tone.as_deref(),
            &request.vocabulary,
        )
        .map_err(MurmurError::processing)
    }
}

/// No-LLM fallback: capitalize the first letter and end with punctuation.
fn basic_cleanup(text: &str) -> String {
    let t = text.trim();
    let mut chars = t.chars();
    let mut s = match chars.next() {
        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
        None => return String::new(),
    };
    if !s.ends_with(['.', '!', '?']) && s.split_whitespace().count() > 3 {
        s.push('.');
    }
    s
}

#[cfg(test)]
mod tests {
    use super::basic_cleanup;

    #[test]
    fn basic_cleanup_capitalizes_and_punctuates_sentences() {
        assert_eq!(
            basic_cleanup("send the report by friday"),
            "Send the report by friday."
        );
    }

    #[test]
    fn basic_cleanup_leaves_short_replies_unpunctuated() {
        assert_eq!(basic_cleanup("sounds good"), "Sounds good");
        assert_eq!(basic_cleanup("   "), "");
    }
}
