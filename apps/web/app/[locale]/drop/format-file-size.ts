const fileSizeUnits = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatFileSize(bytes: number) {
  if (bytes < 1_000) return `${bytes} B`;

  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1_000)), 4);
  const value = bytes / 1_000 ** unitIndex;
  const fractionDigits = value >= 10 ? 0 : 1;

  return `${value.toFixed(fractionDigits)} ${fileSizeUnits[unitIndex]}`;
}
