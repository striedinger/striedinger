#!/usr/bin/env bash
# Downloads the default models into Murmur's data folder (~1 GB STT + ~2.5 GB LLM).
set -euo pipefail

case "$(uname -s)" in
  Darwin) DATA="$HOME/Library/Application Support/Murmur" ;;
  Linux)  DATA="${XDG_DATA_HOME:-$HOME/.local/share}/murmur" ;;
  *)      DATA="${APPDATA:-$HOME}/Murmur" ;;
esac
MODELS="$DATA/models"
mkdir -p "$MODELS"
cd "$MODELS"

STT_NAME="sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8"
STT_URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/$STT_NAME.tar.bz2"

LLM_FILE="Qwen3-4B-Instruct-2507-Q4_K_M.gguf"
LLM_URL="https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF/resolve/main/$LLM_FILE"

if [[ ! -d "$STT_NAME" ]]; then
  echo "==> Speech model (Parakeet TDT 0.6B v3, int8)"
  curl -fL --progress-bar "$STT_URL" -o stt.tar.bz2
  tar xjf stt.tar.bz2 && rm stt.tar.bz2
else
  echo "==> Speech model already present"
fi

if [[ ! -f "$LLM_FILE" ]]; then
  echo "==> Cleanup model (Qwen3 4B Instruct, Q4_K_M)"
  curl -fL --progress-bar "$LLM_URL" -o "$LLM_FILE.part" && mv "$LLM_FILE.part" "$LLM_FILE"
else
  echo "==> Cleanup model already present"
fi

echo
echo "Models in: $MODELS"
ls -lh "$MODELS"
