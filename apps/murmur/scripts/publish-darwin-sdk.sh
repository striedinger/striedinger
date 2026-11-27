#!/usr/bin/env bash
set -euo pipefail

XIP="${1:?usage: publish-darwin-sdk.sh <path to Xcode.xip>}"
REPO="${DARWIN_SDK_REPO:-striedinger/darwin-sdk}"
ARCH="${SDK_HOST_ARCH:-x86_64}"
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
