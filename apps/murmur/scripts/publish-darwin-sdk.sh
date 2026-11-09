#!/usr/bin/env bash
# Builds xtool's Darwin Swift SDK from Xcode.xip and uploads it to a private GitHub repo of
# yours, so your Linux machines can download it for build-mac.sh. CI doesn't need this: it
# builds the SDK from the macOS runner's Xcode on each run.
#
#   apps/murmur/scripts/publish-darwin-sdk.sh ~/Downloads/Xcode_27.1.xip
#
# Needs xtool and an authenticated gh CLI. Run it on Linux (or WSL). Xcode.xip itself
# isn't uploaded: it's ~4 GB and is Apple's to distribute. The SDK stays in a private
# repo for the same reason; Apple's license allows the SDK only on Apple-branded hardware,
# so whether to use it on Linux is your call.
set -euo pipefail

XIP="${1:?usage: publish-darwin-sdk.sh <path to Xcode.xip>}"
REPO="${DARWIN_SDK_REPO:-striedinger/darwin-sdk}"
ARCH="${SDK_HOST_ARCH:-x86_64}"       # the Linux host that will use it; CI runners are x86_64
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "==> Building the Darwin SDK for $ARCH Linux hosts (takes a while)"
xtool sdk build "$XIP" "$WORK" --arch "$ARCH"

ASSET="$WORK/darwin-$ARCH.xtoolsdk.tar.zst"
tar --zstd -cf "$ASSET" -C "$WORK" darwin.xtoolsdk
SIZE=$(stat -c %s "$ASSET" 2>/dev/null || stat -f %z "$ASSET")
echo "   $(( SIZE / 1024 / 1024 )) MB"
if (( SIZE > 2 * 1024 * 1024 * 1024 )); then
  echo "Too big for a GitHub release asset (2 GiB limit)." >&2
  exit 1
fi

if ! gh repo view "$REPO" >/dev/null 2>&1; then
  echo "==> Creating private repo $REPO"
  gh repo create "$REPO" --private \
    --description "xtool Darwin Swift SDK for cross-building Murmur on Linux. Private: contains Apple's SDK."
fi

TAG="xcode-$(basename "$XIP" .xip | sed 's/^Xcode_*//')"
echo "==> Uploading to $REPO release $TAG"
if gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
  gh release upload "$TAG" "$ASSET" --repo "$REPO" --clobber
else
  gh release create "$TAG" "$ASSET" --repo "$REPO" --title "$TAG" --notes "Built by publish-darwin-sdk.sh from $(basename "$XIP")."
fi

cat <<NEXT

Done. On another Linux machine:
  gh release download --repo $REPO --pattern 'darwin-$ARCH.xtoolsdk.tar.zst'
  tar --zstd -xf darwin-$ARCH.xtoolsdk.tar.zst && xtool sdk install darwin.xtoolsdk
NEXT
