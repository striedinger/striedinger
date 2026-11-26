import { copyFile, mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const transformersRequire = createRequire(
  fileURLToPath(import.meta.resolve("@huggingface/transformers")),
);
let runtimeDirectory = dirname(transformersRequire.resolve("onnxruntime-web"));
while (!runtimeDirectory.endsWith("onnxruntime-web")) runtimeDirectory = dirname(runtimeDirectory);
const RUNTIME_VERSION = /** @type {{ version: string }} */ (
  JSON.parse(await readFile(join(runtimeDirectory, "package.json"), "utf8"))
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
