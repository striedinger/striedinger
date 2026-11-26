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

/// Errors surfaced to the native shells. Each carries a message ready to show the user.
#[derive(Debug, thiserror::Error, uniffi::Error)]
pub enum MurmurError {
    /// The engine couldn't start: a missing model, an unreadable config, a broken history
    /// database.
    #[error("{msg}")]
    Setup {
        /// What went wrong.
        msg: String,
    },
    /// A dictation or rewrite failed, for example because the cleanup model errored.
    #[error("{msg}")]
    Processing {
        /// What went wrong.
        msg: String,
    },
}

impl MurmurError {
    fn setup(e: impl std::fmt::Display) -> Self {
        Self::Setup { msg: e.to_string() }
    }
    fn processing(e: impl std::fmt::Display) -> Self {
        Self::Processing { msg: e.to_string() }
    }
}

/// The outcome of one dictation.
#[derive(Debug, Clone, uniffi::Record)]
pub struct DictationResult {
    /// What the speech model heard.
    pub raw: String,
    /// What to paste (equals `raw` for modes without the LLM).
    pub output: String,
    /// Id of the mode that produced `output`.
    pub mode: String,
    /// Time spent transcribing, in milliseconds.
    pub stt_ms: u64,
    /// Time spent in the mode's cleanup, in milliseconds (near 0 without the LLM).
    pub llm_ms: u64,
}

/// A dictation mode as the shells list it in menus.
#[derive(Debug, Clone, uniffi::Record)]
pub struct ModeInfo {
    /// Stable id, passed back as `mode_id`.
    pub id: String,
    /// Display name.
    pub name: String,
    /// Whether the mode runs the cleanup model, which is slower than pasting the transcript.
    pub uses_llm: bool,
}

/// The dictation engine: microphone, speech model, cleanup model, settings and history.
/// One per app.
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
    ///
    /// # Errors
    ///
    /// Fails when the config can't be read or written, a model is missing or won't load,
    /// or the history database can't be opened. A missing microphone is not an error.
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

    /// Starts capturing the microphone. Does nothing without one.
    pub fn start_recording(&self) {
        if let Some(recorder) = &self.recorder {
            recorder.start();
        }
    }

    /// Stops capturing and discards the recording.
    pub fn cancel_recording(&self) {
        if let Some(recorder) = &self.recorder {
            recorder.cancel();
        }
    }

    /// 0.0–1.0, poll ~20×/s for a level meter.
    pub fn input_level(&self) -> f32 {
        self.recorder.as_ref().map_or(0.0, audio::Recorder::level)
    }

    /// Whether a microphone was opened at startup.
    pub fn microphone_available(&self) -> bool {
        self.recorder.is_some()
    }

    /// Stops recording, transcribes, and runs the mode's cleanup.
    /// `app` is the frontmost app's id, used for per-app tone.
    ///
    /// # Errors
    ///
    /// See [`Engine::process_audio`].
    ///
    /// # Panics
    ///
    /// See [`Engine::process_audio`].
    pub fn stop_and_process(
        &self,
        mode_id: Option<String>,
        app: &Option<String>,
    ) -> Result<DictationResult, MurmurError> {
        self.process_audio(&self.stop_recorder(), mode_id, app)
    }

    /// Transcribes and cleans up 16 kHz mono audio that didn't come from the microphone,
    /// such as a file or a test sample. `mode_id` defaults to the configured default mode.
    ///
    /// # Errors
    ///
    /// Fails when the mode doesn't exist or the cleanup model fails.
    ///
    /// # Panics
    ///
    /// Panics if an earlier call panicked while holding the settings or speech model lock.
    pub fn process_audio(
        &self,
        samples: &[f32],
        mode_id: Option<String>,
        app: &Option<String>,
    ) -> Result<DictationResult, MurmurError> {
        let speech = audio::trim_silence(samples);

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
        let stt_ms = elapsed_ms(t);

        let t = Instant::now();
        let output = self.apply_mode(&raw, &mode_id, app.as_deref())?;
        let llm_ms = elapsed_ms(t);

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
    ///
    /// # Errors
    ///
    /// Fails when the mode doesn't exist or the cleanup model fails.
    ///
    /// # Panics
    ///
    /// Panics if an earlier call panicked while holding the settings lock.
    pub fn rewrite(
        &self,
        text: &str,
        mode_id: &str,
        app: &Option<String>,
    ) -> Result<String, MurmurError> {
        self.apply_mode(text, mode_id, app.as_deref())
    }

    /// Spoken command over selected text: "make this shorter", "translate to Spanish".
    /// Stops the recording and returns the edited selection, or the selection unchanged
    /// when nothing was said or there is no cleanup model.
    ///
    /// # Errors
    ///
    /// Fails when the cleanup model fails.
    ///
    /// # Panics
    ///
    /// Panics if an earlier call panicked while holding the settings or speech model lock.
    pub fn command(&self, selection: String, app: &Option<String>) -> Result<String, MurmurError> {
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
        llm.process(
            &selection,
            &instruction,
            tone.as_deref(),
            &vocabulary,
            false,
        )
        .map_err(MurmurError::processing)
    }

    /// The configured modes, in config order.
    ///
    /// # Panics
    ///
    /// Panics if an earlier call panicked while holding the settings lock.
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

    /// Id of the mode used by the main hotkey.
    ///
    /// # Panics
    ///
    /// Panics if an earlier call panicked while holding the settings lock.
    pub fn default_mode(&self) -> String {
        self.config.read().unwrap().default_mode.clone()
    }

    /// Whether the cleanup model is loaded. Without it, LLM modes fall back to basic cleanup.
    pub fn llm_available(&self) -> bool {
        self.llm.is_some()
    }

    /// Up to `limit` past dictations, newest first. Empty if the history can't be read.
    pub fn recent_history(&self, limit: u32) -> Vec<HistoryItem> {
        self.history.recent(limit).unwrap_or_default()
    }

    /// Path of `config.toml`, for an "Open Settings" menu item.
    pub fn config_path(&self) -> String {
        self.dir.join("config.toml").to_string_lossy().into_owned()
    }

    /// Re-reads modes, vocabulary and app rules. Model path changes need a restart.
    ///
    /// # Errors
    ///
    /// Fails when the config can't be read or parsed; the previous settings stay in effect.
    ///
    /// # Panics
    ///
    /// Panics if an earlier call panicked while holding the settings lock.
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
    // MURMUR_GPU_LAYERS overrides the setting without editing config.toml, for diagnosing
    // GPU problems (0 runs the cleanup model on the CPU only).
    let gpu_layers = std::env::var("MURMUR_GPU_LAYERS")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(config.llm.gpu_layers);
    let llm = llm::Llm::load(
        &Config::resolve(dir, &config.llm.model_path),
        gpu_layers,
        config.llm.context_size,
        config.llm.max_tokens,
    )?;
    if let Some(mode) = config
        .mode(&config.default_mode)
        .filter(|mode| mode.use_llm)
    {
        llm.process(
            "Hello there.",
            &mode.instruction,
            None,
            &config.vocabulary,
            mode.examples,
        )?;
    }
    Ok(Some(llm))
}

/// What one LLM request needs from the settings. It's copied out so the config lock
/// isn't held for the seconds the model runs, which would stall a settings reload.
struct ModeRequest {
    instruction: String,
    tone: Option<String>,
    vocabulary: Vec<String>,
    examples: bool,
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
                examples: mode.examples,
            };
            (llm, request)
        };
        llm.process(
            text,
            &request.instruction,
            request.tone.as_deref(),
            &request.vocabulary,
            request.examples,
        )
        .map_err(MurmurError::processing)
    }
}

/// Milliseconds since `start`, saturating at `u64::MAX` (about 585 million years).
fn elapsed_ms(start: Instant) -> u64 {
    u64::try_from(start.elapsed().as_millis()).unwrap_or(u64::MAX)
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
