#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/../.." && pwd)"
cd "$REPO"

HOST="$(uname -s)"
ARCH="${ARCH:-arm64}"
DEPLOYMENT_TARGET="13.0"
case "$ARCH" in
  arm64) RUST_TARGET="aarch64-apple-darwin" ;;
  x86_64) RUST_TARGET="x86_64-apple-darwin" ;;
  *) echo "Unsupported ARCH=$ARCH" >&2; exit 1 ;;
esac
SWIFT_TRIPLE="$ARCH-apple-macosx"
CLANG_TARGET="$ARCH-apple-macos$DEPLOYMENT_TARGET"
SIGN_IDENTITY="${SIGN_IDENTITY:--}"
TARGET_DIR="$REPO/target/$RUST_TARGET/release"
GEN="$ROOT/mac/generated"
APP="$ROOT/build/Murmur.app"
FRAMEWORKS="$APP/Contents/Frameworks"
export MACOSX_DEPLOYMENT_TARGET="$DEPLOYMENT_TARGET"

if [[ "$HOST" == "Darwin" ]]; then
  INSTALL_NAME_TOOL=install_name_tool
  OTOOL=otool
  SWIFT_SDK_ARGS=(--arch "$ARCH")
else
  REAL_HOME="$(getent passwd "$(id -u)" | cut -d: -f6)"
  SDK_SEARCH=()
  for dir in "${DARWIN_SDK_DIR:-}" "${XDG_CONFIG_HOME:+$XDG_CONFIG_HOME/swiftpm/swift-sdks}" \
             "$HOME/.swiftpm/swift-sdks" "$REAL_HOME/.swiftpm/swift-sdks"; do
    [[ -n "$dir" && -d "$dir" ]] && SDK_SEARCH+=("$dir")
  done
  SDKROOT="$(swift sdk configure --show-configuration darwin "$SWIFT_TRIPLE" 2>/dev/null \
    | sed -nE 's/^sdkRootPath: (.+)$/\1/p' | head -n 1 || true)"
  if [[ -z "$SDKROOT" && ${#SDK_SEARCH[@]} -gt 0 ]]; then
    SDKROOT="$(find -L "${SDK_SEARCH[@]}" -maxdepth 8 -type d -name 'MacOSX*.sdk' 2>/dev/null | sort | tail -n 1 || true)"
  fi
  LD64=""
  if [[ ${#SDK_SEARCH[@]} -gt 0 ]]; then
    LD64="$(find -L "${SDK_SEARCH[@]}" -maxdepth 6 -path '*toolset/bin/orig/ld64.lld' 2>/dev/null | head -n 1 || true)"
  fi
  if [[ -z "$SDKROOT" || -z "$LD64" ]]; then
    echo "Darwin SDK not found. Install it with: xtool sdk install <Xcode.xip or darwin.xtoolsdk>" >&2
    exit 1
  fi
  export SDKROOT
  echo "==> Using $SDKROOT"
  TOOLSET_BIN="$(dirname "$(dirname "$LD64")")"
  find_tool() {
    local name="$1" found
    if found="$(command -v "$name")"; then echo "$found"; return; fi
    if [[ -x "$TOOLSET_BIN/$name" ]]; then echo "$TOOLSET_BIN/$name"; return; fi
    found="$(compgen -c "$name-" | grep -E "^$name-[0-9]+$" | sort -t- -k3 -n | tail -n 1 || true)"
    if [[ -n "$found" ]]; then command -v "$found"; return; fi
    echo "Missing $name (see README: Building on Linux)" >&2
    exit 1
  }
  CLANG="$(find_tool clang)"
  CLANGXX="$(find_tool clang++)"
  AR="$(find_tool llvm-ar)"
  RANLIB="$(find_tool llvm-ranlib)"
  INSTALL_NAME_TOOL="$(find_tool llvm-install-name-tool)"
  OTOOL="$(find_tool llvm-otool)"
  find_tool rcodesign >/dev/null
  SWIFT_SDK_ARGS=(--swift-sdk "$SWIFT_TRIPLE")

  if ! command -v cc >/dev/null; then
    HOST_TRIPLE="$(rustc -vV | sed -n 's/^host: //p')"
    HOST_ENV="${HOST_TRIPLE//-/_}"
    export "CARGO_TARGET_$(echo "$HOST_ENV" | tr '[:lower:]' '[:upper:]')_LINKER=$CLANG"
    export "CC_$HOST_ENV=$CLANG" "CXX_$HOST_ENV=$CLANGXX"
  fi

  CLANG_RT_DIR="$(dirname "$(find -L "${SDK_SEARCH[@]}" -name libclang_rt.osx.a 2>/dev/null | head -n 1)")"
  if [[ "$CLANG_RT_DIR" == "." ]]; then
    CLANG_RT_DIR="$REPO/target/darwin-clang-rt"
    mkdir -p "$CLANG_RT_DIR"
    [[ -f "$CLANG_RT_DIR/libclang_rt.osx.a" ]] || "$AR" rc --format=darwin "$CLANG_RT_DIR/libclang_rt.osx.a"
    echo "==> No libclang_rt.osx.a in the SDK; using an empty stand-in"
  else
    echo "==> Using compiler-rt from $CLANG_RT_DIR"
  fi

  TRIPLE_ENV="${RUST_TARGET//-/_}"
  TRIPLE_ENV_UPPER="$(echo "$TRIPLE_ENV" | tr '[:lower:]' '[:upper:]')"
  APPLE_FLAGS="--target=$CLANG_TARGET -isysroot $SDKROOT"
  export "CC_$TRIPLE_ENV=$CLANG" "CXX_$TRIPLE_ENV=$CLANGXX" "AR_$TRIPLE_ENV=$AR"
  export "CFLAGS_$TRIPLE_ENV=$APPLE_FLAGS" "CXXFLAGS_$TRIPLE_ENV=$APPLE_FLAGS"
  export "BINDGEN_EXTRA_CLANG_ARGS_$TRIPLE_ENV=$APPLE_FLAGS"
  export "CARGO_TARGET_${TRIPLE_ENV_UPPER}_LINKER=$CLANG"
  export "CARGO_TARGET_${TRIPLE_ENV_UPPER}_RUSTFLAGS=-C link-arg=--target=$CLANG_TARGET -C link-arg=-isysroot -C link-arg=$SDKROOT -C link-arg=-fuse-ld=lld -C link-arg=--ld-path=$LD64 -C link-arg=-L$CLANG_RT_DIR"

  TOOLCHAIN="$REPO/target/darwin-$ARCH.cmake"
  mkdir -p "$REPO/target"
  cat > "$TOOLCHAIN" <<EOF
set(CMAKE_SYSTEM_NAME Darwin)
set(CMAKE_SYSTEM_PROCESSOR $ARCH)
set(CMAKE_OSX_SYSROOT "$SDKROOT")
set(CMAKE_OSX_ARCHITECTURES $ARCH)
set(CMAKE_OSX_DEPLOYMENT_TARGET $DEPLOYMENT_TARGET)
set(CMAKE_C_COMPILER "$CLANG")
set(CMAKE_CXX_COMPILER "$CLANGXX")
set(CMAKE_C_COMPILER_TARGET $CLANG_TARGET)
set(CMAKE_CXX_COMPILER_TARGET $CLANG_TARGET)
set(CMAKE_AR "$AR")
set(CMAKE_RANLIB "$RANLIB")
set(CMAKE_INSTALL_NAME_TOOL "$INSTALL_NAME_TOOL")
# -fuse-ld=lld (not a path) tells clang the linker is lld, so it passes the Mach-O
# arguments ld64.lld requires, such as -platform_version.
set(CMAKE_EXE_LINKER_FLAGS_INIT "-fuse-ld=lld --ld-path=$LD64 -L$CLANG_RT_DIR")
set(CMAKE_SHARED_LINKER_FLAGS_INIT "-fuse-ld=lld --ld-path=$LD64 -L$CLANG_RT_DIR")
set(CMAKE_MODULE_LINKER_FLAGS_INIT "-fuse-ld=lld --ld-path=$LD64 -L$CLANG_RT_DIR")
set(CMAKE_FIND_ROOT_PATH "$SDKROOT")
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
# Metal shaders are embedded as source and compiled at runtime, so no Metal compiler is needed.
set(GGML_METAL_EMBED_LIBRARY ON CACHE BOOL "" FORCE)
EOF
  export "CMAKE_TOOLCHAIN_FILE_$TRIPLE_ENV=$TOOLCHAIN"
fi

echo "==> Building Rust core ($RUST_TARGET)"
rustup target add "$RUST_TARGET" >/dev/null 2>&1 || true
mkdir -p "$TARGET_DIR/deps"
cargo build --release --locked -p murmur-core --target "$RUST_TARGET"

echo "==> Generating Swift bindings"
BINDINGS="$REPO/target/murmur-bindings"
rm -rf "$BINDINGS" "$GEN"
cargo run --release --locked -q -p murmur-bindgen -- generate \
  --library "$TARGET_DIR/libmurmur_core.dylib" \
  --language swift \
  --out-dir "$BINDINGS"
mkdir -p "$GEN/ffi" "$GEN/swift"
cp "$BINDINGS/murmur_coreFFI.h" "$GEN/ffi/"
cp "$BINDINGS/murmur_core.swift" "$GEN/swift/"
cat > "$GEN/ffi/module.modulemap" <<'EOF'
module murmur_coreFFI {
    header "murmur_coreFFI.h"
    link "murmur_core"
    export *
}
EOF

echo "==> Assembling app bundle"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$FRAMEWORKS" "$APP/Contents/Resources"
cp "$ROOT/mac/Info.plist" "$APP/Contents/Info.plist"
cp -R "$ROOT"/mac/resources/*.lproj "$APP/Contents/Resources/"

cp "$TARGET_DIR/libmurmur_core.dylib" "$FRAMEWORKS/"
"$INSTALL_NAME_TOOL" -id "@rpath/libmurmur_core.dylib" "$FRAMEWORKS/libmurmur_core.dylib"

linked_dylibs() {
  "$OTOOL" -L "$1" | tail -n +2 | awk '{print $1}'
}

bundle_deps() {
  local lib="$1"
  linked_dylibs "$lib" | while read -r dep; do
    case "$dep" in
      /usr/lib/*|/System/*|@rpath/libmurmur_core.dylib) continue ;;
    esac
    local name; name="$(basename "$dep")"
    if [[ ! -f "$FRAMEWORKS/$name" ]]; then
      local src="$dep"
      if [[ "$dep" == @rpath/* || ! -f "$dep" ]]; then
        src="$(find "$REPO/target" -name "$name" -type f 2>/dev/null | head -n 1 || true)"
      fi
      if [[ -z "$src" || ! -f "$src" ]]; then
        echo "   ! couldn't find $name (linked from $(basename "$lib"))" >&2
        continue
      fi
      echo "   + $name"
      cp "$src" "$FRAMEWORKS/$name"
      chmod u+w "$FRAMEWORKS/$name"
      "$INSTALL_NAME_TOOL" -id "@rpath/$name" "$FRAMEWORKS/$name"
      bundle_deps "$FRAMEWORKS/$name"
    fi
    "$INSTALL_NAME_TOOL" -change "$dep" "@rpath/$name" "$lib" 2>/dev/null || true
  done
}
bundle_deps "$FRAMEWORKS/libmurmur_core.dylib"

echo "==> Building Swift app ($SWIFT_TRIPLE)"
SWIFT_ARGS=(
  -c release --package-path "$ROOT/mac" "${SWIFT_SDK_ARGS[@]}"
  -Xlinker -L -Xlinker "$FRAMEWORKS"
  -Xlinker -rpath -Xlinker "@executable_path/../Frameworks"
)
env -u SDKROOT swift build "${SWIFT_ARGS[@]}"
cp "$(env -u SDKROOT swift build "${SWIFT_ARGS[@]}" --show-bin-path)/Murmur" "$APP/Contents/MacOS/Murmur"

if [[ "$HOST" == "Darwin" ]]; then
  echo "==> Signing ($SIGN_IDENTITY)"
  for lib in "$FRAMEWORKS"/*.dylib; do
    codesign --force --sign "$SIGN_IDENTITY" "$lib"
  done
  codesign --force --sign "$SIGN_IDENTITY" "$APP"
else
  echo "==> Signing (ad-hoc, rcodesign)"
  rcodesign sign "$APP"
fi

echo
echo "Built $APP"
echo "Models go in: ~/Library/Application Support/Murmur/models  (run scripts/download-models.sh on the Mac)"
