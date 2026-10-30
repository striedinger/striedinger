/** Returns the URL normalized when it uses HTTP or HTTPS, or an empty string otherwise. */
export function safeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

/** Returns the URL normalized when it uses HTTPS, or an empty string otherwise. */
export function safeHttpsUrl(value: string) {
  const url = safeHttpUrl(value);
  return url.startsWith("https:") ? url : "";
}
