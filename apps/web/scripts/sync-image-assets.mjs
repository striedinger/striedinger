import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = dirname(fileURLToPath(import.meta.resolve("@jsquash/avif")));
// The image worker reads the same version, so a dependency bump moves both to a new path.
const AVIF_VERSION = /** @type {{ version: string }} */ (
  JSON.parse(await readFile(join(packageDirectory, "package.json"), "utf8"))
).version;
const outputDirectory = fileURLToPath(
  new URL(`../public/vendor/jsquash-avif/${AVIF_VERSION}/`, import.meta.url),
);

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  copyFile(
    fileURLToPath(new URL("./assets/avif-codec-worker.js", import.meta.url)),
    join(outputDirectory, "worker.js"),
  ),
  copyFile(join(packageDirectory, "codec/enc/avif_enc.js"), join(outputDirectory, "avif_enc.js")),
  copyFile(
    join(packageDirectory, "codec/enc/avif_enc.wasm"),
    join(outputDirectory, "avif_enc.wasm"),
  ),
  copyFile(join(packageDirectory, "meta.js"), join(outputDirectory, "meta.js")),
  copyFile(join(packageDirectory, "utils.js"), join(outputDirectory, "utils.js")),
  copyFile(join(packageDirectory, "LICENSE"), join(outputDirectory, "LICENSE.txt")),
]);
