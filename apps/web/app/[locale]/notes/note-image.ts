const maximumImageDimension = 1600;
/** List rows and gallery cards show photos at most this large, at the highest pixel density. */
const thumbnailDimension = 160;
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

export interface PreparedNoteImage {
  source: string;
  /** A small copy for list rows and gallery cards, so they never decode the full photo. */
  thumbnail: string | null;
}

/**
 * Downscales a photo before it is embedded in a note so large camera images do not bloat
 * IndexedDB or slow down editing, and makes a small thumbnail for the notes list. Animated
 * GIFs are kept as-is to preserve their frames.
 */
export async function prepareNoteImage(file: File): Promise<PreparedNoteImage | null> {
  if (!file.type.startsWith("image/") || file.size > maximumImageBytes) return null;
  if (file.type === "image/gif" || typeof createImageBitmap === "undefined") {
    return { source: await readFileAsDataUrl(file), thumbnail: null };
  }
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const keepsTransparency = file.type === "image/png" || file.type === "image/webp";
    const type = keepsTransparency ? "image/webp" : "image/jpeg";
    const [image, thumbnail] = await Promise.all([
      encodeScaled(bitmap, maximumImageDimension, type, 0.84),
      encodeScaled(bitmap, thumbnailDimension, type, 0.72),
    ]);
    return {
      source: image ? await readFileAsDataUrl(image) : await readFileAsDataUrl(file),
      thumbnail: thumbnail ? await readFileAsDataUrl(thumbnail) : null,
    };
  } catch {
    return { source: await readFileAsDataUrl(file), thumbnail: null };
  } finally {
    bitmap?.close();
  }
}

function encodeScaled(
  bitmap: ImageBitmap,
  maximumDimension: number,
  type: string,
  quality: number,
) {
  const scale = Math.min(1, maximumDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return Promise.resolve(null);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob | null>(function encodeImage(resolve) {
    canvas.toBlob(resolve, type, quality);
  });
}
