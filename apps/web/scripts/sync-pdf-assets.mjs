import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const QPDF_RUN_VERSION = "0.2.1";
const packageDirectory = dirname(dirname(fileURLToPath(import.meta.resolve("qpdf-run"))));
const outputDirectory = fileURLToPath(
  new URL(`../public/vendor/qpdf-run/${QPDF_RUN_VERSION}/`, import.meta.url),
);

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  copyFile(join(packageDirectory, "src/worker.js"), join(outputDirectory, "worker.js")),
  copyFile(join(packageDirectory, "vendor/qpdf/lib/qpdf.js"), join(outputDirectory, "qpdf.js")),
  copyFile(join(packageDirectory, "vendor/qpdf/lib/qpdf.wasm"), join(outputDirectory, "qpdf.wasm")),
  copyFile(join(packageDirectory, "LICENSE"), join(outputDirectory, "LICENSE-qpdf-run.txt")),
  copyFile(
    fileURLToPath(new URL("../licenses/qpdf-11.10.0.txt", import.meta.url)),
    join(outputDirectory, "LICENSE-qpdf.txt"),
  ),
]);
