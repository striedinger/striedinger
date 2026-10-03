const maximumImageDimension = 1600;
const maximumImageBytes = 25 * 1024 * 1024;

function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise(function readFile(resolve, reject) {
    const reader = new FileReader();
    reader.addEventListener("load", function resolveDataUrl() {
      resolve(typeof reader.result === "string" ? reader.result : "");
    });
    reader.addEventListener("error", function rejectDataUrl() {
      reject(reader.error ?? new Error("Image could not be read"));
    });
    reader.readAsDataURL(file);
  });
}

/**
 * Downscales a photo before it is embedded in a note so large camera images do not bloat
 * IndexedDB or slow down editing. Animated GIFs are kept as-is to preserve their frames.
 */
export async function prepareNoteImage(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/") || file.size > maximumImageBytes) return null;
  if (file.type === "image/gif" || typeof createImageBitmap === "undefined") {
    return readFileAsDataUrl(file);
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maximumImageDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return readFileAsDataUrl(file);
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const keepsTransparency = file.type === "image/png" || file.type === "image/webp";
    const blob = await new Promise<Blob | null>(function encodeImage(resolve) {
      canvas.toBlob(resolve, keepsTransparency ? "image/webp" : "image/jpeg", 0.84);
    });
    return blob ? readFileAsDataUrl(blob) : readFileAsDataUrl(file);
  } catch {
    return readFileAsDataUrl(file);
  }
}
