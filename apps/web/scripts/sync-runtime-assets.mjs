import { rm } from "node:fs/promises";

await Promise.all(
  ["jsquash-avif", "pdfjs-dist", "qpdf-run", "onnxruntime-web"].map(function clearRuntime(name) {
    return rm(new URL(`../public/vendor/${name}/`, import.meta.url), {
      recursive: true,
      force: true,
    });
  }),
);

await Promise.all([
  import("./sync-image-assets.mjs"),
  import("./sync-pdf-assets.mjs"),
  import("./sync-video-assets.mjs"),
]);
