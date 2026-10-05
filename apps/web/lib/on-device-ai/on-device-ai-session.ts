/**
 * Helpers for the code that runs a model. Features import this lazily, after the browser has
 * confirmed the API and the person has asked for a result.
 */

/** Reports model download progress, from 0 to 1, while `create()` fetches the model. */
export function monitorDownload(onProgress: (fraction: number) => void) {
  return function attachDownloadMonitor(monitor: AICreateMonitor) {
    monitor.addEventListener("downloadprogress", function reportProgress(event) {
      onProgress(event.loaded);
    });
  };
}

/** Reads a streamed response, calling back with the whole text so far after each chunk. */
export async function readStreamedText(
  stream: ReadableStream<string>,
  onText: (text: string) => void,
) {
  let text = "";
  const reader = stream.getReader();
  for (;;) {
    // oxlint-disable-next-line no-await-in-loop -- Stream chunks must be read in order.
    const { done, value } = await reader.read();
    if (done) return text;
    text += value;
    onText(text);
  }
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}
