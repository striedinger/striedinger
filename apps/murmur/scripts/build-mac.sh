#!/usr/bin/env bash
# Builds the Rust core, generates Swift bindings, compiles the menu bar app,
# and assembles build/Murmur.app.
#
#   ./scripts/build-mac.sh                 # release build, ad-hoc signed
#   SIGN_IDENTITY="Apple Development: you@example.com" ./scripts/build-mac.sh
#
# Tip: sign with a stable identity. macOS ties the Accessibility permission to the
# signature, so with ad-hoc signing you'll have to re-grant it after every rebuild.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ARCH="$(uname -m)"                         # arm64 or x86_64
SIGN_IDENTITY="${SIGN_IDENTITY:--}"
TARGET_DIR="$ROOT/target/release"
GEN="$ROOT/mac/generated"
APP="$ROOT/build/Murmur.app"
FRAMEWORKS="$APP/Contents/Frameworks"

echo "==> Building Rust core"
cargo build --release -p murmur_core

echo "==> Generating Swift bindings"
rm -rf "$GEN" && mkdir -p "$GEN"
cargo run --release -q --bin uniffi-bindgen -- generate \
  --library "$TARGET_DIR/libmurmur_core.dylib" \
  --language swift \
  --out-dir "$GEN"

echo "==> Assembling app bundle"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$FRAMEWORKS" "$APP/Contents/Resources"
cp "$ROOT/mac/Info.plist" "$APP/Contents/Info.plist"
cp -R "$ROOT"/mac/resources/*.lproj "$APP/Contents/Resources/"

# Copy the core dylib and any non-system dylibs it links (onnxruntime, sherpa-onnx…).
cp "$TARGET_DIR/libmurmur_core.dylib" "$FRAMEWORKS/"
install_name_tool -id "@rpath/libmurmur_core.dylib" "$FRAMEWORKS/libmurmur_core.dylib"

bundle_deps() {
  local lib="$1"
  otool -L "$lib" | tail -n +2 | awk '{print $1}' | while read -r dep; do
    case "$dep" in
      /usr/lib/*|/System/*|@rpath/libmurmur_core.dylib) continue ;;
    esac
    local name; name="$(basename "$dep")"
    if [[ ! -f "$FRAMEWORKS/$name" ]]; then
      local src="$dep"
      if [[ "$dep" == @rpath/* || ! -f "$dep" ]]; then
        src="$(find "$TARGET_DIR" -name "$name" -type f 2>/dev/null | head -n 1 || true)"
      fi
      if [[ -z "$src" || ! -f "$src" ]]; then
        echo "   ! couldn't find $name (linked from $(basename "$lib"))" >&2
        continue
      fi
      echo "   + $name"
      cp "$src" "$FRAMEWORKS/$name"
      chmod u+w "$FRAMEWORKS/$name"
      install_name_tool -id "@rpath/$name" "$FRAMEWORKS/$name"
      bundle_deps "$FRAMEWORKS/$name"
    fi
    install_name_tool -change "$dep" "@rpath/$name" "$lib" 2>/dev/null || true
  done
}
bundle_deps "$FRAMEWORKS/libmurmur_core.dylib"

echo "==> Compiling Swift app"
swiftc \
  -O -swift-version 5 \
  -target "$ARCH-apple-macos13.0" \
  -module-name Murmur \
  -I "$GEN" \
  -Xcc "-fmodule-map-file=$GEN/murmur_coreFFI.modulemap" \
  -L "$FRAMEWORKS" -lmurmur_core \
  -Xlinker -rpath -Xlinker "@executable_path/../Frameworks" \
  -framework AppKit -framework SwiftUI -framework AVFoundation \
  -framework ApplicationServices -framework CoreGraphics \
  "$ROOT"/mac/sources/*.swift "$GEN/murmur_core.swift" \
  -o "$APP/Contents/MacOS/Murmur"

echo "==> Signing ($SIGN_IDENTITY)"
for lib in "$FRAMEWORKS"/*.dylib; do
  codesign --force --sign "$SIGN_IDENTITY" "$lib"
done
# No hardened runtime: it isn't needed for a personal build, and its library
# validation would refuse the bundled dylibs under ad-hoc signing.
codesign --force --sign "$SIGN_IDENTITY" "$APP"

echo
echo "Built $APP"
echo "Models go in: ~/Library/Application Support/Murmur/models  (run scripts/download-models.sh)"
echo "Run:  open \"$APP\"      Logs:  log stream --predicate 'process == \"Murmur\"'"
