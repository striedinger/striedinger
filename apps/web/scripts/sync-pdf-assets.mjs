import { copyFile, cp, mkdir, readFile } from "node:fs/promises";
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

// pdf.js font, character map, and image decoder data, fetched only when "Smallest" mode
// renders a document that needs them, such as one with fonts it does not embed.
const PDFJS_VERSION = JSON.parse(
  await readFile(fileURLToPath(import.meta.resolve("pdfjs-dist/package.json")), "utf8"),
).version;
const pdfjsDirectory = dirname(fileURLToPath(import.meta.resolve("pdfjs-dist/package.json")));
const pdfjsOutputDirectory = fileURLToPath(
  new URL(`../public/vendor/pdfjs-dist/${PDFJS_VERSION}/`, import.meta.url),
);
await Promise.all(
  ["standard_fonts", "cmaps", "wasm"].map(function copyPdfjsData(directory) {
    return cp(join(pdfjsDirectory, directory), join(pdfjsOutputDirectory, directory), {
      recursive: true,
    });
  }),
);
await copyFile(join(pdfjsDirectory, "LICENSE"), join(pdfjsOutputDirectory, "LICENSE-pdfjs.txt"));
