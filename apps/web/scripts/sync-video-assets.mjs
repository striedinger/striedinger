import { copyFile, mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The ONNX Runtime WebAssembly builds that run Whisper captions on the device. They are served
// from this site instead of a CDN and fetched only when someone generates captions: the
// WebGPU-capable build where WebGPU exists, and the smaller CPU-only build everywhere else.
const transformersRequire = createRequire(
  fileURLToPath(import.meta.resolve("@huggingface/transformers")),
);
// The package does not export package.json, so walk up from its entry point.
let runtimeDirectory = dirname(transformersRequire.resolve("onnxruntime-web"));
while (!runtimeDirectory.endsWith("onnxruntime-web")) runtimeDirectory = dirname(runtimeDirectory);
const RUNTIME_VERSION = JSON.parse(
  await readFile(join(runtimeDirectory, "package.json"), "utf8"),
).version;
const outputDirectory = fileURLToPath(
  new URL(`../public/vendor/onnxruntime-web/${RUNTIME_VERSION}/`, import.meta.url),
);

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  ...[
    "ort-wasm-simd-threaded.mjs",
    "ort-wasm-simd-threaded.wasm",
    "ort-wasm-simd-threaded.asyncify.mjs",
    "ort-wasm-simd-threaded.asyncify.wasm",
  ].map(function copyRuntimeFile(fileName) {
    return copyFile(join(runtimeDirectory, "dist", fileName), join(outputDirectory, fileName));
  }),
  copyFile(
    fileURLToPath(new URL("../licenses/onnxruntime.txt", import.meta.url)),
    join(outputDirectory, "LICENSE-onnxruntime.txt"),
  ),
]);
