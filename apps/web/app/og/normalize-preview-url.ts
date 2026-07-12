export function normalizePreviewUrl(value: string): string {
  const trimmedValue = value.trim();

  try {
    const url = new URL(trimmedValue);
    url.hash = "";
    return url.toString();
  } catch {
    return trimmedValue;
  }
}
