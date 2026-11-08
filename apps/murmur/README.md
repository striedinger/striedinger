# Murmur

Private, local voice dictation. Hold a key, talk, and cleaned-up text lands in
whatever field you're typing in. Speech recognition and the cleanup model both
run on your machine. Nothing goes to the cloud.

## How to use it

| Action | What happens |
|---|---|
| Hold **Right ⌥** | Push-to-talk in the current mode; release to paste |
| Double-tap **Right ⌥** | Hands-free; tap once more to finish |
| Select text, hold **Right ⌥ + Shift** | Speak an edit ("make this shorter", "translate to Spanish"); the selection gets replaced |
| **Esc** while recording | Cancel |

Choose the mode in the menu bar: **Raw**, **Clean up**, **Email** or **Bullet list**.
You can add your own modes in `config.toml`.

## Architecture

```
core/            Rust, shared by every platform
  audio.rs       cpal mic capture → 16 kHz mono, silence trim
  stt.rs         Parakeet TDT 0.6B v3 via sherpa-onnx
  llm.rs         embedded llama.cpp (Metal on Mac), cleanup prompts + guardrails
  config.rs      TOML settings: modes, vocabulary, per-app tone
  history.rs     SQLite history
  lib.rs         `Engine`, exported to native code with UniFFI
mac/sources/                 Swift / AppKit / SwiftUI shell (~600 lines)
  hotkey-monitor.swift       CGEventTap: bare-modifier push-to-talk, Esc swallow
  dictation-controller.swift hold / double-tap / command state machine
  text-inserter.swift        clipboard + ⌘V with clipboard restore; AX selected-text read
  overlay.swift              non-activating floating pill with level meter
  app-delegate.swift         menu bar (built lazily on open), permissions, engine lifecycle
mac/resources/*.lproj        translations: en, es, de, it, fr, pt, zh-Hans, ja
```

## Performance notes

- Both models load in parallel at startup, and a warm-up request runs in the default mode.
- The LLM keeps one context and its KV cache for the app's lifetime. Requests reuse the
  longest shared token prefix (the system prompt), so usually only the transcript gets
  evaluated. Generation is capped near the input length.
- The mic stream stays open for zero-latency starts. The trade-off is that the menu bar mic
  indicator stays on and the CPU wakes for audio callbacks.
  See `audio.rs` to switch to play/pause per recording.
- History writes use SQLite WAL, and the menu reads history only when it opens.

This app isn't a pnpm workspace package (it has no `package.json`), so `pnpm`/`turbo`
tasks skip it. Build it with the scripts below, run from `apps/murmur`.

To add Windows or Linux later, write a new shell against the same `Engine` API.
UniFFI can generate C# bindings through `uniffi-bindgen-cs`, or you can call it straight from Rust.

## Setup (macOS, Apple Silicon recommended)

```bash
xcode-select --install                 # Swift compiler + SDK
curl https://sh.rustup.rs -sSf | sh    # Rust
brew install cmake                     # needed to build llama.cpp

./scripts/download-models.sh           # ~3.5 GB total
./scripts/build-mac.sh
open build/Murmur.app
```

On first launch, grant:
1. **Microphone**: you'll see a prompt.
2. **Accessibility**: System Settings → Privacy & Security → Accessibility → enable Murmur.
   This is needed for the global hotkey and for pasting. Murmur picks it up within 2 s,
   so you don't need to relaunch.

Loading the models takes a few seconds. The menu bar shows "Ready" once they're loaded.

## Configuration

Settings live in `~/Library/Application Support/Murmur/config.toml`, which is created on
first run. Use **Menu bar → Open Settings…** and then **Reload Settings** after editing.

- `vocabulary`: names and jargon to spell correctly
- `[[modes]]`: an id, a name, whether to use the LLM, and an instruction
- `[[app_rules]]`: a tone per app (bundle id). Find an app's id with
  `osascript -e 'id of app "Slack"'`
- `llm.enabled = false`: run raw speech-to-text only (lighter and faster)
- To try other LLMs, drop any GGUF instruct model into `models/` and point `llm.model_path` at it.
  3–8B models are a good balance. Smaller ones (1–2B) are faster but follow instructions less reliably.

To use a different trigger key, change `HotkeyMonitor.triggerKeyCode` and
`triggerFlagMask` (Right ⌘ = 54 / 0x10).

## Status

This is a first scaffold. It was written without compiling, so expect a handful of fixes on
the first build. The likeliest spots:

- **`llm.rs`**: the llama-cpp-2 API moves between 0.1.x releases (`chat_template`,
  `apply_chat_template`, `token_to_bytes`, `clear_kv_cache_seq`). Pin the version that
  `cargo` picks and adjust names if needed. If `LlamaModel` isn't `Sync` in your version,
  wrap it the same way `Session` is wrapped.
- **`stt.rs`**: the sherpa-rs `TransducerConfig` field names. Check them against the crate's
  `examples/parakeet.rs`.
- **`build-mac.sh`**: how sherpa-rs ships onnxruntime (static or dylib) decides which
  dylibs get bundled. Run `otool -L build/Murmur.app/Contents/Frameworks/*.dylib` if
  the app fails to launch.

## Roadmap

- [ ] Suggestion popup: show the cleaned text plus 1–2 alternatives, Enter to accept
- [ ] Streaming: transcribe in chunks while you talk, so long dictations don't wait until release
- [ ] Streaming cleanup: start the LLM on partial transcripts while you're still talking
- [ ] Learn from edits: notice corrections after pasting and add them to `vocabulary`
- [ ] Silero VAD in place of the energy-based trim
- [ ] Settings window in SwiftUI (replacing hand-editing the TOML)
- [ ] Windows shell (C#/WinUI 3: SendInput, UI Automation, low-level keyboard hook)
- [ ] Linux shell (GTK4; X11 first, then Wayland through portals)
