//! Settings live in a single TOML file in the app's data directory.
//! A commented default is written on first launch so it's easy to hand-edit.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub stt: SttConfig,
    pub llm: LlmConfig,
    /// Mode used by the main hotkey.
    pub default_mode: String,
    /// Names, jargon and spellings the models should get right.
    #[serde(default)]
    pub vocabulary: Vec<String>,
    #[serde(default)]
    pub modes: Vec<Mode>,
    /// Per-app tone, matched on the frontmost app's bundle id (Mac) or exe name (Windows).
    #[serde(default)]
    pub app_rules: Vec<AppRule>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SttConfig {
    /// Directory with encoder/decoder/joiner .onnx files and tokens.txt.
    pub model_dir: String,
    pub threads: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmConfig {
    pub enabled: bool,
    pub model_path: String,
    pub gpu_layers: u32,
    pub context_size: u32,
    pub max_tokens: u32,
    /// Transcripts shorter than this many words skip the LLM (fast path for "yes", "sounds good").
    pub skip_below_words: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Mode {
    pub id: String,
    pub name: String,
    /// false = paste the raw transcript.
    pub use_llm: bool,
    /// Instruction for this mode. Appended to the shared system prompt.
    #[serde(default)]
    pub instruction: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppRule {
    pub app: String,
    pub tone: String,
}

pub const DEFAULT_CONFIG: &str = r#"# Murmur settings. Paths are relative to this folder unless absolute.
# Restart Murmur after editing (menu bar > Reload Settings also works).

default_mode = "clean"

# Words the models tend to get wrong. Used as spelling hints during cleanup.
vocabulary = ["Murmur", "UniFFI", "Parakeet"]

[stt]
model_dir = "models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8"
threads = 4

[llm]
enabled = true
model_path = "models/Qwen3-4B-Instruct-2507-Q4_K_M.gguf"
gpu_layers = 99
context_size = 4096
max_tokens = 768
skip_below_words = 4

[[modes]]
id = "raw"
name = "Raw"
use_llm = false

[[modes]]
id = "clean"
name = "Clean up"
use_llm = true
instruction = "Fix punctuation, capitalization and obvious recognition errors. Remove filler words (um, uh, like, you know) and false starts. When the speaker corrects themselves, keep only the correction. Keep their wording and tone otherwise."

[[modes]]
id = "email"
name = "Email"
use_llm = true
instruction = "Rewrite as a clear, friendly, concise email body. Use short paragraphs. Do not add a subject line or a signature."

[[modes]]
id = "bullets"
name = "Bullet list"
use_llm = true
instruction = "Rewrite as a concise bulleted list using '- ' bullets. One idea per bullet."

[[app_rules]]
app = "com.tinyspeck.slackmacgap"
tone = "Casual chat message. Short. Lowercase is fine."

[[app_rules]]
app = "com.apple.mail"
tone = "Professional but warm."

[[app_rules]]
app = "com.microsoft.VSCode"
tone = "Technical. Keep code identifiers, file names and commands exactly as spoken; wrap them in backticks."
"#;

impl Config {
    pub fn load_or_create(dir: &Path) -> anyhow::Result<Self> {
        std::fs::create_dir_all(dir)?;
        let path = dir.join("config.toml");
        if !path.exists() {
            std::fs::write(&path, DEFAULT_CONFIG)?;
        }
        let text = std::fs::read_to_string(&path)?;
        let cfg: Config = toml::from_str(&text)?;
        Ok(cfg)
    }

    pub fn resolve(dir: &Path, p: &str) -> PathBuf {
        let p = PathBuf::from(p);
        if p.is_absolute() { p } else { dir.join(p) }
    }

    pub fn mode(&self, id: &str) -> Option<&Mode> {
        self.modes.iter().find(|m| m.id == id)
    }

    pub fn tone_for(&self, app: Option<&str>) -> Option<&str> {
        let app = app?;
        self.app_rules.iter().find(|r| r.app == app).map(|r| r.tone.as_str())
    }
}
