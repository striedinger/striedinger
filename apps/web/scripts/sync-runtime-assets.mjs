import { rm } from "node:fs/promises";

// These namespaces are generated entirely from the installed dependencies. A cached
// public directory can contain older versions, which would otherwise ship forever.
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
