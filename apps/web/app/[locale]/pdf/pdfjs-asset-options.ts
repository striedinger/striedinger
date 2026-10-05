/**
 * Font, character map, and WebAssembly data published by scripts/sync-pdf-assets.mjs. pdf.js
 * needs them to read text in fonts a document does not embed, common in Chinese and Japanese.
 */
export function getPdfjsAssetOptions(version: string) {
  const assetRoot = new URL(`/vendor/pdfjs-dist/${version}/`, globalThis.location.origin);
  return {
    cMapPacked: true,
    cMapUrl: new URL("cmaps/", assetRoot).href,
    standardFontDataUrl: new URL("standard_fonts/", assetRoot).href,
    wasmUrl: new URL("wasm/", assetRoot).href,
  };
}
