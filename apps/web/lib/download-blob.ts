/** Saves a blob through a temporary link, then releases its object URL. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(function releaseUrl() {
    URL.revokeObjectURL(url);
  }, 1_000);
}
