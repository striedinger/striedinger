await Promise.all([
  import("./sync-image-assets.mjs"),
  import("./sync-pdf-assets.mjs"),
  import("./sync-theme-assets.mjs"),
]);
