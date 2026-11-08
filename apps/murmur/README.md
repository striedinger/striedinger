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
crates/murmur-core/   Rust, shared by every platform (top-level crates/ in the monorepo)
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
mac/Package.swift            SwiftPM package: Swift wrapper and C module over the Rust dylib, plus the app
crates/murmur-bindgen/       UniFFI generator; reads the built dylib, so it never builds the core for the host
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
tasks skip it. The Rust core is a member of the Cargo workspace at the repo root. Build
with the scripts below, which you can run from anywhere.

To add Windows or Linux later, write a new shell against the same `Engine` API.
UniFFI can generate C# bindings through `uniffi-bindgen-cs`, or you can call it straight from Rust.

## Setup (macOS, Apple Silicon recommended)

```bash
xcode-select --install                 # Swift compiler + SDK
curl https://sh.rustup.rs -sSf | sh    # Rust
brew install cmake                     # needed to build llama.cpp

./scripts/download-models.sh           # ~3.5 GB total
./scripts/build-mac.sh                 # or ARCH=x86_64 for Intel Macs
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

CI (`.github/workflows/murmur.yml`) builds everything on each change: the Rust core is
formatted, linted and tested on Linux, and the full `Murmur.app` is built and checked on a
macOS runner. Nobody has run the app against real models yet, so expect tuning on first use.

## Building on Linux (xtool)

`build-mac.sh` also cross-compiles the whole app from Linux. It uses xtool's Darwin Swift
SDK for Swift and as the sysroot for clang, ld64.lld for Mach-O linking, and
[rcodesign](https://github.com/indygreg/apple-platform-rs) for ad-hoc signing.
You copy the resulting `Murmur.app` to a Mac to run it.

One-time setup (on Linux or WSL):

1. Install [Swift 6.4](https://swift.org/install/linux), [xtool](https://xtool.sh),
   rustup, `cmake`, `llvm` (for `llvm-ar`, `llvm-otool` and `llvm-install-name-tool`),
   `libclang-dev`, and `rcodesign`.
2. Download Xcode.xip with your Apple ID from developer.apple.com.
3. Build the SDK and publish it to the private `striedinger/darwin-sdk` repo. The script
   creates the repo if it doesn't exist:
   ```bash
   apps/murmur/scripts/publish-darwin-sdk.sh ~/Downloads/Xcode_27.1.xip
   ```
4. Install it locally (`xtool sdk install <darwin.xtoolsdk>`). For CI, add the
   `DARWIN_SDK_TOKEN` secret (read access to that repo), which enables the
   `linux-cross` job.

Then run `apps/murmur/scripts/build-mac.sh` as on a Mac.

The SDK stays in a private repo because it's Apple's. Apple's license allows it only on
Apple-branded hardware, so using it on Linux is your call.

## Roadmap

- [ ] Suggestion popup: show the cleaned text plus 1–2 alternatives, Enter to accept
- [ ] Streaming: transcribe in chunks while you talk, so long dictations don't wait until release
- [ ] Streaming cleanup: start the LLM on partial transcripts while you're still talking
- [ ] Learn from edits: notice corrections after pasting and add them to `vocabulary`
- [ ] Silero VAD in place of the energy-based trim
- [ ] Settings window in SwiftUI (replacing hand-editing the TOML)
- [ ] Windows shell (C#/WinUI 3: SendInput, UI Automation, low-level keyboard hook)
- [ ] Linux shell (GTK4; X11 first, then Wayland through portals)
